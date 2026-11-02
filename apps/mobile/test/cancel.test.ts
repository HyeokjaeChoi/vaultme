import { txHash, type ChainSnapshot, type Hex } from '@vaultme/wallet-core'
import { Mnemonic } from '@vaultme/wallet-core/signer'
import { describe, expect, it, vi } from 'vitest'
import { canCancel, quoteCancel, runCancel } from '../src/features/send/model/cancel'
import { cancelIndexOf, explorerHash, processedBeforeCancel } from '../src/features/send/model/hashes'
import type { SendDeps } from '../src/features/send/model/runSend'
import { canSpeedUp, quoteSpeedUp } from '../src/features/send/model/speedUp'
import type { PendingTx } from '../src/shared/storage'

// Published BIP39 test vector (all-zero entropy). Not a wallet phrase.
const VECTOR = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const TO = '0x9F3C7A210Bd4E6c855A13F90C2E78D16AB0441Ab'
const FROM = '0x1a2b3C4d5e6F7A8B9c0D1e2f3A4B5c6d7e8F9A0B'
const GWEI = 1_000_000_000n
const H1 = '0x' + '11'.repeat(32)

const snap = (over: Partial<ChainSnapshot> = {}): ChainSnapshot => ({
  nonce: 6,
  nativeBalance: 10n ** 18n,
  tokenBalance: 0n,
  gasLimit: 65_000n, // a token send: the cancel must still use 21000
  baseFeePerGas: GWEI,
  maxPriorityFeePerGas: GWEI / 2n,
  ...over,
})
const record = (over: Partial<PendingTx> = {}): PendingTx => ({
  hash: H1,
  hashes: [H1],
  nonce: 5,
  asset: 'USDC',
  to: TO,
  amount: '12.5',
  createdAt: 1,
  lastCheckedAt: 1,
  state: 'Pending',
  maxFeePerGas: String(4n * GWEI),
  maxPriorityFeePerGas: String(2n * GWEI),
  ...over,
})

function setup(stored: PendingTx | null | 'corrupt' = record(), s = snap()) {
  const raws: Hex[] = []
  const saved: PendingTx[] = []
  const d: SendDeps = {
    chain: {
      broadcasts: true,
      getSnapshot: vi.fn(() => Promise.resolve(s)),
      submit: (raw) => {
        raws.push(raw)
        return Promise.resolve(txHash(raw))
      },
    },
    loadPhrase: vi.fn(() => Promise.resolve({ status: 'ok' as const, mnemonic: new Mnemonic(VECTOR) })),
    readPending: () => stored,
    savePending: (tx) => void saved.push(tx),
    now: () => 99,
    prompt: { title: 'auth', cancel: 'cancel' },
  }
  return { d, raws, saved }
}

describe('quoteCancel', () => {
  it('is a 21000-gas, fee-only plan on the speed-up fee rule, whatever the original asset', async () => {
    const { d } = setup()
    const plan = await quoteCancel(record(), FROM, d.chain)
    expect(plan.gasLimit).toBe(21_000n)
    expect(plan.maxFeePerGas).toBe(4_400_000_001n)
    expect(plan.needed).toBe(plan.newFeeCap)
    expect(d.chain.getSnapshot).toHaveBeenCalledWith(FROM, 'ETH', FROM, '0')
  })
  it('too little ETH for the fee disables it with the shortfall', async () => {
    const { d } = setup(record(), snap({ nativeBalance: 1n }))
    expect((await quoteCancel(record(), FROM, d.chain)).shortBy).toBeGreaterThan(0n)
  })
  it('is offered only while Pending and before any cancel; speed up is hidden after a cancel', () => {
    expect(canCancel(record(), true)).toBe(true)
    expect(canCancel(record(), false)).toBe(false)
    expect(canCancel(record({ state: 'Included' }), true)).toBe(false)
    const cancelled = record({ hashes: [H1, '0x2'], kind: 'cancel' })
    expect(canCancel(cancelled, true)).toBe(false)
    expect(canSpeedUp(cancelled, true)).toBe(false)
    expect(canSpeedUp(record({ kind: 'speedUp' }), true)).toBe(true)
  })
  it('a cancel after a speed up bases on the speed-up fee', async () => {
    const { d } = setup()
    const sped = record({ kind: 'speedUp', maxFeePerGas: String(8n * GWEI) })
    expect((await quoteCancel(sped, FROM, d.chain)).maxFeePerGas).toBeGreaterThan(
      (await quoteCancel(record(), FROM, d.chain)).maxFeePerGas,
    )
    expect((await quoteSpeedUp(sped, FROM, d.chain)).maxFeePerGas).toBeGreaterThan(8n * GWEI)
  })
})

describe('runCancel (ADR-0031)', () => {
  it('signs a 0 ETH self-send with the same nonce, records the hash with kind cancel and stays Pending', async () => {
    const { d, raws, saved } = setup()
    const approved = await quoteCancel(record(), FROM, d.chain)
    const out = await runCancel(record(), approved, FROM, d)
    expect(out.status).toBe('Sent')
    expect(raws).toHaveLength(1) // the raw fields (nonce, gas 21000, value 0, to self) are checked in wallet-core `signReplacement`
    expect(saved[0]).toMatchObject({ hash: H1, to: TO, state: 'Pending', kind: 'cancel', lastCheckedAt: 99 })
    expect(saved[0]!.hashes).toEqual([H1, txHash(raws[0]!)])
    expect(cancelIndexOf(saved[0]!)).toBe(1)
  })
  it('auth cancel and auth error sign nothing', async () => {
    for (const [status, want] of [
      ['cancelled', 'Cancelled'],
      ['error', 'AuthError'],
    ] as const) {
      const { d, raws, saved } = setup()
      const approved = await quoteCancel(record(), FROM, d.chain)
      d.loadPhrase = () => Promise.resolve({ status })
      expect((await runCancel(record(), approved, FROM, d)).status).toBe(want)
      expect(raws).toEqual([])
      expect(saved).toEqual([])
    }
  })
  it('a record that is no longer Pending is not touched and auth is not asked', async () => {
    for (const stored of [
      record({ state: 'Included' }),
      record({ hash: '0x' + '22'.repeat(32) }),
      null,
      'corrupt',
    ] as const) {
      const { d, raws } = setup(stored)
      const approved = await quoteCancel(record(), FROM, d.chain)
      expect((await runCancel(record(), approved, FROM, d)).status).toBe('NotPending')
      expect(d.loadPhrase).not.toHaveBeenCalled()
      expect(raws).toEqual([])
    }
  })
  it('a fee that rose above the shown plan, or ETH that ran short, asks again and signs nothing', async () => {
    const shown = await quoteCancel(record(), FROM, setup().d.chain)
    const high = setup(record(), snap({ baseFeePerGas: 100n * GWEI }))
    expect((await runCancel(record(), shown, FROM, high.d)).status).toBe('NeedsReview')
    expect(high.raws).toEqual([])
    const short = setup(record(), snap({ nativeBalance: 1n }))
    expect((await runCancel(record(), shown, FROM, short.d)).status).toBe('NeedsReview')
  })
  it('an unclear submit records the hash and says Unknown; a chain error before records nothing', async () => {
    const approved = await quoteCancel(record(), FROM, setup().d.chain)
    const a = setup()
    a.d.chain = { ...a.d.chain, getSnapshot: () => Promise.reject(new Error('offline')) }
    expect((await runCancel(record(), approved, FROM, a.d)).status).toBe('ChainError')
    expect(a.saved).toEqual([])
    const b = setup()
    b.d.chain = { ...b.d.chain, submit: () => Promise.reject(new Error('timeout')) }
    expect((await runCancel(record(), approved, FROM, b.d)).status).toBe('Unknown')
    expect(b.saved[0]).toMatchObject({ kind: 'cancel' })
  })
})

describe('processedBeforeCancel', () => {
  const c = record({ hashes: [H1, '0x2', '0x3'], kind: 'cancel' })
  it('is true only when a cancel was sent and a hash other than the cancel was mined', () => {
    expect(processedBeforeCancel({ ...c, minedHash: H1 })).toBe(true)
    expect(processedBeforeCancel({ ...c, minedHash: '0x2' })).toBe(true) // a speed up ran first
    expect(processedBeforeCancel({ ...c, minedHash: '0x3' })).toBe(false) // the cancel ran
    expect(processedBeforeCancel(c)).toBe(false) // nothing mined yet
    expect(processedBeforeCancel({ ...record(), minedHash: H1 })).toBe(false) // no cancel
    expect(explorerHash({ ...c, minedHash: '0x3' })).toBe('0x3')
  })
})
