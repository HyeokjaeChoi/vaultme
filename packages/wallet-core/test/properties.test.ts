import fc from 'fast-check'
import { getAddress } from 'viem'
import { describe, expect, test, vi } from 'vitest'
import {
  ABS_MAX_FEE_WEI,
  AmountError,
  ASSETS,
  deriveState,
  formatAmount,
  fromUnits,
  minedIndex,
  planCancel,
  planSpeedUp,
  prepare,
  toUnits,
  type AssetId,
  type ChainSnapshot,
  type TxFacts,
  type TxReceipt,
  type TxStatus,
} from '../src'
import { Mnemonic, signAndSubmit } from '../src/signer'
import { PUBLIC_JUNK_PHRASE, RECIPIENT } from './fixtures'

// CHAIN-5 (quality-gates plan): 1,000 runs per property. A failure prints the seed and the counterexample; replay it with
// `fc.assert(property, { seed, path })`. Money-math and state invariants that example tests cannot cover.
const RUNS = { numRuns: 1000 }
vi.setConfig({ testTimeout: 30_000 }) // 1,000 runs take 1 s here; a loaded CI runner needs room, a slow property is not a failure
const assetArb = fc.constantFrom<AssetId>('ETH', 'USDC')
const GWEI = 10n ** 9n
const addressArb = fc.stringMatching(/^[0-9a-f]{40}$/).map((h) => `0x${h}` as const) // lowercase: accepted without a checksum

const snapshotArb: fc.Arbitrary<ChainSnapshot> = fc.record({
  nonce: fc.nat(1_000_000),
  nativeBalance: fc.bigInt({ min: 0n, max: 10n ** 22n }),
  tokenBalance: fc.bigInt({ min: 0n, max: 10n ** 15n }),
  gasLimit: fc.bigInt({ min: 21_000n, max: 500_000n }),
  // Up to 2,000 gwei: some runs cross the absolute fee cap on purpose.
  // Half the runs use fees that fit the absolute cap (a ready review); the rest go up to 2,000 gwei and cross it on purpose.
  baseFeePerGas: fc.oneof(fc.bigInt({ min: 0n, max: 4n * GWEI }), fc.bigInt({ min: 0n, max: 2_000n * GWEI })),
  maxPriorityFeePerGas: fc.oneof(fc.bigInt({ min: 0n, max: 2n * GWEI }), fc.bigInt({ min: 0n, max: 100n * GWEI })),
})
// A snapshot that always gives a ready review for 1 wei of ETH: rich balance, fees whose cap stays within ABS_MAX_FEE_WEI.
const readyArb: fc.Arbitrary<ChainSnapshot> = fc.record({
  nonce: fc.nat(1_000_000),
  nativeBalance: fc.bigInt({ min: 10n ** 18n, max: 10n ** 22n }),
  tokenBalance: fc.constant(0n),
  gasLimit: fc.bigInt({ min: 21_000n, max: 500_000n }),
  baseFeePerGas: fc.bigInt({ min: 0n, max: 4n * GWEI }),
  maxPriorityFeePerGas: fc.bigInt({ min: 0n, max: 2n * GWEI }),
})
const capOf = (s: ChainSnapshot) => s.gasLimit * (2n * s.baseFeePerGas + s.maxPriorityFeePerGas)

describe('prepare (property)', () => {
  let ready = 0
  test('the outcome is exact, and a ready review respects the fee cap, the balances and the shortfall rule', () => {
    fc.assert(
      fc.property(
        snapshotArb,
        assetArb,
        addressArb,
        fc.nat(1100), // permille of the balance: up to 110 %, so both sides of "enough" are hit
        fc.option(fc.bigInt({ min: 0n, max: 10n ** 15n }), { nil: null }),
        (s, asset, to, permille, nearBalance) => {
          const native = asset === 'ETH'
          const balance = native ? s.nativeBalance : s.tokenBalance
          // Every other ETH run asks for an amount just under the balance: that is where the fee shortfall rule decides.
          const share = (balance * BigInt(permille)) / 1000n
          const rawAmount =
            nearBalance !== null && native && balance > nearBalance + 1n
              ? balance - nearBalance
              : share > 0n
                ? share
                : 1n
          const r = prepare({ asset, to, amount: fromUnits(rawAmount, asset), previous: [] }, s)
          // The inputs are valid and above zero, so the outcome follows from the balance and the fee cap alone (this order).
          const expected = rawAmount > balance ? 'insufficientFunds' : capOf(s) > ABS_MAX_FEE_WEI ? 'overAbsCap' : 'ok'
          if (expected !== 'ok') {
            expect(r).toEqual({ ok: false, error: expected })
            return
          }
          expect(r.ok).toBe(true)
          if (!r.ok) return
          ready++
          const v = r.review
          expect(v.feeCap).toBeLessThanOrEqual(ABS_MAX_FEE_WEI)
          expect(v.feeCap).toBe(v.gasLimit * v.maxFeePerGas)
          expect(v.estimatedFee).toBeLessThanOrEqual(v.feeCap)
          expect(v.amount).toBe(rawAmount)
          expect(v.nonce).toBe(s.nonce)
          const need = v.feeCap + (native ? v.amount : 0n)
          const shortfall = v.warnings.find((w) => w.kind === 'nativeFeeShortfall')
          if (need > s.nativeBalance)
            expect(shortfall).toEqual({ kind: 'nativeFeeShortfall', shortBy: need - s.nativeBalance })
          else expect(shortfall).toBeUndefined()
        },
      ),
      RUNS,
    )
    expect(ready, 'ready reviews among the runs').toBeGreaterThan(200)
  })

  test('address rules (viem 2.57 behavior, pinned): lowercase and a good checksum pass; a bad checksum and ALL-UPPERCASE fail', () => {
    const ask = (to: string) =>
      prepare(
        { asset: 'ETH', to: to as `0x${string}`, amount: '0.001', previous: [] },
        {
          nonce: 0,
          nativeBalance: 10n ** 18n,
          tokenBalance: 0n,
          gasLimit: 21_000n,
          baseFeePerGas: GWEI,
          maxPriorityFeePerGas: GWEI,
        },
      )
    const good = getAddress(RECIPIENT)
    expect(ask(good).ok).toBe(true)
    expect(ask(good.toLowerCase()).ok).toBe(true)
    const flipped = good.replace(/[a-fA-F]/, (c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()))
    expect(ask(flipped)).toEqual({ ok: false, error: 'invalidAddress' })
    expect(ask(`0x${good.slice(2).toUpperCase()}`)).toEqual({ ok: false, error: 'invalidAddress' })
  })
})

describe('signAndSubmit guards (property)', () => {
  test('a changed nonce or a higher fee cap never reaches the signer or the node', async () => {
    const mnemonic = new Mnemonic(PUBLIC_JUNK_PHRASE)
    await fc.assert(
      fc.asyncProperty(
        readyArb,
        fc.constantFrom('nonce', 'cap'),
        fc.bigInt({ min: 1n, max: 500n * GWEI }),
        async (s, what, extra) => {
          const ok = prepare({ asset: 'ETH', to: RECIPIENT, amount: '0.000000000000000001', previous: [] }, s)
          if (!ok.ok) throw new Error('a ready snapshot must give a review') // not a discard: readyArb is built to be ready
          // One change at a time, so each guard is tested alone: a new nonce with the same fees, or a higher fee cap with the same nonce.
          const latest: ChainSnapshot =
            what === 'nonce' ? { ...s, nonce: s.nonce + 1 } : { ...s, baseFeePerGas: s.baseFeePerGas + extra }
          const expected = capOf(latest) > ABS_MAX_FEE_WEI ? 'Blocked' : 'NeedsReview'
          const submit = vi.fn()
          expect((await signAndSubmit(ok.review, latest, { mnemonic, submit })).status).toBe(expected)
          expect(submit).not.toHaveBeenCalled()
        },
      ),
      RUNS,
    )
  })
})

describe('speed up and cancel fee plans (property)', () => {
  const feeArb = fc.record({
    maxFeePerGas: fc.bigInt({ min: 1n, max: 1_000n * GWEI }),
    maxPriorityFeePerGas: fc.bigInt({ min: 1n, max: 100n * GWEI }),
  })
  const planArb = fc.record({
    latestSent: feeArb,
    market: feeArb,
    baseFeePerGas: fc.bigInt({ min: 0n, max: 1_000n * GWEI }),
    gasLimit: fc.bigInt({ min: 21_000n, max: 500_000n }),
    asset: assetArb,
    amount: fc.bigInt({ min: 0n, max: 10n ** 21n }),
    nativeBalance: fc.bigInt({ min: 0n, max: 10n ** 22n }),
  })

  test('each fee field rises at least 10 % and never sits below the market; the sums are exact', () => {
    fc.assert(
      fc.property(planArb, (i) => {
        const p = planSpeedUp(i)
        expect(p.maxFeePerGas).toBeGreaterThanOrEqual(i.market.maxFeePerGas)
        expect(p.maxPriorityFeePerGas).toBeGreaterThanOrEqual(i.market.maxPriorityFeePerGas)
        expect(p.maxFeePerGas * 10n).toBeGreaterThan(i.latestSent.maxFeePerGas * 11n)
        expect(p.maxPriorityFeePerGas * 10n).toBeGreaterThan(i.latestSent.maxPriorityFeePerGas * 11n)
        expect(p.newFeeCap).toBe(i.gasLimit * p.maxFeePerGas)
        expect(p.currentFeeCap).toBe(i.gasLimit * i.latestSent.maxFeePerGas)
        expect(p.extra).toBe(p.newFeeCap - p.currentFeeCap)
        expect(p.estimatedFee).toBeLessThanOrEqual(p.newFeeCap)
        expect(p.overAbsCap).toBe(p.newFeeCap > ABS_MAX_FEE_WEI)
        const needed = p.newFeeCap + (ASSETS[i.asset].kind === 'native' ? i.amount : 0n)
        expect(p.needed).toBe(needed)
        expect(p.shortBy).toBe(needed > i.nativeBalance ? needed - i.nativeBalance : 0n)
      }),
      RUNS,
    )
  })

  test('a cancel is 21,000 gas and needs only its fee cap', () => {
    fc.assert(
      fc.property(planArb, (i) => {
        const p = planCancel(i)
        expect(p.gasLimit).toBe(21_000n)
        expect(p.needed).toBe(p.newFeeCap)
        expect(p.maxFeePerGas * 10n).toBeGreaterThan(i.latestSent.maxFeePerGas * 11n)
      }),
      RUNS,
    )
  })
})

describe('deriveState (property)', () => {
  const statuses: TxStatus[] = ['Pending', 'Unknown', 'Included', 'Confirmed', 'Failed', 'Replaced']
  const receiptArb: fc.Arbitrary<TxReceipt | null> = fc.option(
    fc.record({
      status: fc.constantFrom('success' as const, 'reverted' as const),
      blockNumber: fc.bigInt({ min: 1n, max: 100n }),
    }),
    { nil: null },
  )
  const factsArb: fc.Arbitrary<TxFacts> = fc.record({
    current: fc.constantFrom(...statuses),
    nonce: fc.nat(20),
    receipts: fc.array(receiptArb, { minLength: 1, maxLength: 3 }),
    safeBlock: fc.option(fc.bigInt({ min: 0n, max: 100n }), { nil: null }),
    safeNonce: fc.option(fc.bigInt({ min: 0n, max: 25n }), { nil: null }),
    cancelFrom: fc.option(fc.nat(2), { nil: null }),
  })
  const live = factsArb.filter((f) => f.current === 'Pending' || f.current === 'Unknown' || f.current === 'Included')

  test('a final state never moves', () => {
    fc.assert(
      fc.property(factsArb, (f) => {
        if (f.current === 'Confirmed' || f.current === 'Failed' || f.current === 'Replaced')
          expect(deriveState(f)).toBe(f.current)
      }),
      RUNS,
    )
  })

  test('the result is a fixed point: asking again with the result as current gives the same state', () => {
    fc.assert(
      fc.property(live, (f) => {
        const s = deriveState(f)
        expect(deriveState({ ...f, current: s })).toBe(s)
      }),
      RUNS,
    )
  })

  test('Confirmed and Failed need a receipt at or below `safe`, and Confirmed needs a success', () => {
    fc.assert(
      fc.property(live, (f) => {
        const s = deriveState(f)
        if (s !== 'Confirmed' && s !== 'Failed') return
        const i = minedIndex(f.receipts)
        const r = i === null ? null : f.receipts[i]
        expect(r).not.toBeNull()
        expect(f.safeBlock).not.toBeNull()
        expect(r!.blockNumber).toBeLessThanOrEqual(f.safeBlock!)
        expect(s === 'Confirmed').toBe(r!.status === 'success')
        expect(f.cancelFrom != null && i! >= f.cancelFrom).toBe(false) // a mined cancel is Replaced, never a verdict on the send
      }),
      RUNS,
    )
  })

  test('a mined cancel is Pending above `safe` and Replaced at or below it (ADR-0031)', () => {
    fc.assert(
      fc.property(live, (f) => {
        const i = minedIndex(f.receipts)
        fc.pre(i !== null && f.cancelFrom != null && i >= f.cancelFrom)
        const r = f.receipts[i]!
        expect(deriveState(f)).toBe(f.safeBlock !== null && r.blockNumber <= f.safeBlock ? 'Replaced' : 'Pending')
      }),
      RUNS,
    )
  })

  test('no receipt and a `safe` nonce past ours is Replaced', () => {
    fc.assert(
      fc.property(live, (f) => {
        fc.pre(minedIndex(f.receipts) === null && f.safeNonce !== null && f.safeNonce > BigInt(f.nonce))
        expect(deriveState(f)).toBe('Replaced')
      }),
      RUNS,
    )
  })

  test('a receipt of the send at or below `safe` is final, above it (or without `safe`) it is Included', () => {
    fc.assert(
      fc.property(live, (f) => {
        const i = minedIndex(f.receipts)
        fc.pre(i !== null && (f.cancelFrom == null || i < f.cancelFrom))
        const r = f.receipts[i]!
        const s = deriveState(f)
        if (f.safeBlock !== null && r.blockNumber <= f.safeBlock)
          expect(s).toBe(r.status === 'success' ? 'Confirmed' : 'Failed')
        else expect(s).toBe('Included')
      }),
      RUNS,
    )
  })

  test('Replaced needs another tx on our nonce, or a mined cancel at or below `safe`', () => {
    fc.assert(
      fc.property(live, (f) => {
        if (deriveState(f) !== 'Replaced') return
        const i = minedIndex(f.receipts)
        if (i === null) {
          expect(f.safeNonce).not.toBeNull()
          expect(f.safeNonce!).toBeGreaterThan(BigInt(f.nonce))
        } else {
          expect(f.cancelFrom != null && i >= f.cancelFrom).toBe(true)
          expect(f.safeBlock).not.toBeNull()
          expect(f.receipts[i]!.blockNumber).toBeLessThanOrEqual(f.safeBlock!)
        }
      }),
      RUNS,
    )
  })

  test('an Included send whose receipts are all gone is Pending or Replaced, never a success', () => {
    fc.assert(
      fc.property(live, (f) => {
        const s = deriveState({ ...f, current: 'Included', receipts: f.receipts.map(() => null) })
        expect(['Pending', 'Replaced']).toContain(s)
      }),
      RUNS,
    )
  })
})

describe('amounts (property)', () => {
  const rawArb = fc.bigInt({ min: 0n, max: 10n ** 24n })

  test('leading and trailing zeros change nothing', () => {
    fc.assert(
      fc.property(assetArb, rawArb, fc.nat(3), fc.nat(4), (a, raw, lead, trail) => {
        const canonical = fromUnits(raw, a)
        const [int = '0', frac = ''] = canonical.split('.')
        fc.pre(frac.length + trail <= ASSETS[a].decimals)
        const padded = `${'0'.repeat(lead)}${int}.${frac}${'0'.repeat(trail)}`
        fc.pre(frac.length + trail > 0)
        expect(toUnits(padded, a)).toBe(raw)
      }),
      RUNS,
    )
  })

  test('a fraction longer than the asset decimals is refused, never rounded', () => {
    fc.assert(
      fc.property(assetArb, fc.nat(1_000_000), fc.stringMatching(/^[0-9]{1,6}$/), (a, whole, extra) => {
        const d = ASSETS[a].decimals
        const decimal = `${String(whole)}.${'1'.repeat(d)}${extra}`
        expect(() => toUnits(decimal, a)).toThrow(expect.objectContaining({ code: 'tooManyDecimals' }) as AmountError)
      }),
      RUNS,
    )
  })

  test('the floor display never shows more than the balance', () => {
    fc.assert(
      fc.property(assetArb, rawArb, (a, raw) => {
        const shown = formatAmount(raw, a, 'floor')
        if (shown.startsWith('<')) {
          expect(raw).toBeGreaterThan(0n)
          expect(raw).toBeLessThan(10n ** BigInt(ASSETS[a].decimals - ASSETS[a].display.maxFraction))
        } else {
          expect(toUnits(shown, a)).toBeLessThanOrEqual(raw)
          expect(raw - toUnits(shown, a)).toBeLessThan(
            10n ** BigInt(ASSETS[a].decimals - ASSETS[a].display.maxFraction),
          )
        }
      }),
      RUNS,
    )
  })
})
