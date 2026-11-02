import { txHash, type ChainSnapshot, type Hex } from '@vaultme/wallet-core'
import { Mnemonic } from '@vaultme/wallet-core/signer'
import { describe, expect, it, vi } from 'vitest'
import { explorerHash, ownHashes } from '../src/features/send/model/hashes'
import type { SendDeps } from '../src/features/send/model/runSend'
import { canSpeedUp, quoteSpeedUp, runSpeedUp } from '../src/features/send/model/speedUp'
import type { PendingTx } from '../src/shared/storage'

// Published BIP39 test vector (all-zero entropy). Not a wallet phrase.
const VECTOR = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const TO = '0x9F3C7A210Bd4E6c855A13F90C2E78D16AB0441Ab'
const FROM = '0x1a2b3C4d5e6F7A8B9c0D1e2f3A4B5c6d7e8F9A0B'
const GWEI = 1_000_000_000n
const H1 = '0x' + '11'.repeat(32)
const prompt = { title: 'auth', cancel: 'cancel' }

const snap = (over: Partial<ChainSnapshot> = {}): ChainSnapshot => ({
  nonce: 6, // the pending count already includes our tx: the record's nonce is used
  nativeBalance: 10n ** 18n,
  tokenBalance: 0n,
  gasLimit: 21_000n,
  baseFeePerGas: GWEI,
  maxPriorityFeePerGas: GWEI / 2n,
  ...over,
})
const record = (over: Partial<PendingTx> = {}): PendingTx => ({
  hash: H1,
  hashes: [H1],
  nonce: 5,
  asset: 'ETH',
  to: TO,
  amount: '0.05',
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
      getSnapshot: () => Promise.resolve(s),
      submit: (raw) => {
        raws.push(raw)
        return Promise.resolve(txHash(raw))
      },
    },
    loadPhrase: vi.fn(() => Promise.resolve({ status: 'ok' as const, mnemonic: new Mnemonic(VECTOR) })),
    readPending: () => stored,
    savePending: (tx) => void saved.push(tx),
    now: () => 99,
    prompt,
  }
  return { d, raws, saved }
}

describe('quoteSpeedUp', () => {
  it('bases the fee on the latest sent fields and shows current and new max fee', async () => {
    const { d } = setup()
    const plan = await quoteSpeedUp(record(), FROM, d.chain)
    expect(plan.maxFeePerGas).toBe(4_400_000_001n)
    expect(plan.maxPriorityFeePerGas).toBe(2_200_000_001n)
    expect(plan.currentFeeCap).toBe(21_000n * 4n * GWEI)
    expect(plan.shortBy).toBe(0n)
  })
  it('a record saved before ADR-0031 has no sent fees: the market value is the base', async () => {
    const { d } = setup()
    const old = { ...record(), maxFeePerGas: undefined, maxPriorityFeePerGas: undefined } as unknown as PendingTx
    delete (old as Partial<PendingTx>).maxFeePerGas
    delete (old as Partial<PendingTx>).maxPriorityFeePerGas
    const plan = await quoteSpeedUp(old, FROM, d.chain)
    expect(plan.maxFeePerGas).toBe(((2n * GWEI + GWEI / 2n) * 11n) / 10n + 1n)
  })
  it('too little ETH disables it with the shortfall', async () => {
    const { d } = setup(record(), snap({ nativeBalance: 5n * 10n ** 16n }))
    const plan = await quoteSpeedUp(record(), FROM, d.chain)
    expect(plan.shortBy).toBe(plan.newFeeCap)
  })
  it('only a Pending send on a broadcasting adapter can be sped up', () => {
    expect(canSpeedUp(record(), true)).toBe(true)
    expect(canSpeedUp(record(), false)).toBe(false)
    for (const state of ['Included', 'Unknown', 'Confirmed', 'Failed', 'Replaced'] as const)
      expect(canSpeedUp(record({ state }), true)).toBe(false)
  })
})

describe('runSpeedUp (ADR-0031)', () => {
  it('signs the same tx with the same nonce and higher fees, and records the new hash first-hash-first', async () => {
    const { d, raws, saved } = setup()
    const approved = await quoteSpeedUp(record(), FROM, d.chain)
    const out = await runSpeedUp(record(), approved, FROM, d)
    expect(out.status).toBe('Sent')
    // The signed fields (nonce, to, value, gas, chain, fees) are checked on the raw tx in wallet-core `signReplacement`.
    expect(raws).toHaveLength(1)
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({
      hash: H1,
      state: 'Pending',
      kind: 'speedUp',
      maxFeePerGas: String(approved.maxFeePerGas),
      lastCheckedAt: 99,
    })
    expect(saved[0]!.hashes).toEqual([H1, txHash(raws[0]!)])
  })
  it('a second speed up bases on the first: no count limit', async () => {
    const { d, saved } = setup()
    const first = await quoteSpeedUp(record(), FROM, d.chain)
    await runSpeedUp(record(), first, FROM, d)
    const again = await quoteSpeedUp(saved[0]!, FROM, d.chain)
    expect(again.maxFeePerGas).toBeGreaterThan(first.maxFeePerGas)
  })
  it('auth cancel and auth error sign nothing', async () => {
    for (const [status, want] of [
      ['cancelled', 'Cancelled'],
      ['error', 'AuthError'],
    ] as const) {
      const { d, raws, saved } = setup()
      const approved = await quoteSpeedUp(record(), FROM, d.chain)
      d.loadPhrase = () => Promise.resolve({ status })
      expect((await runSpeedUp(record(), approved, FROM, d)).status).toBe(want)
      expect(raws).toEqual([])
      expect(saved).toEqual([])
    }
  })
  it('a send that is no longer Pending (or was replaced by a new record) is not touched, and auth is not asked', async () => {
    for (const stored of [
      record({ state: 'Included' }),
      record({ hash: '0x' + '22'.repeat(32) }),
      null,
      'corrupt',
    ] as const) {
      const { d, raws } = setup(stored)
      const approved = await quoteSpeedUp(record(), FROM, d.chain)
      expect((await runSpeedUp(record(), approved, FROM, d)).status).toBe('NotPending')
      expect(d.loadPhrase).not.toHaveBeenCalled()
      expect(raws).toEqual([])
    }
  })
  it('a fee that rose above the shown plan, or ETH that ran short, asks again and signs nothing', async () => {
    const { d, raws } = setup(record(), snap({ baseFeePerGas: 100n * GWEI }))
    const shown = await quoteSpeedUp(record(), FROM, setup().d.chain)
    const out = await runSpeedUp(record(), shown, FROM, d)
    expect(out.status).toBe('NeedsReview')
    expect(raws).toEqual([])
    const short = setup(record(), snap({ nativeBalance: 1n }))
    expect((await runSpeedUp(record(), shown, FROM, short.d)).status).toBe('NeedsReview')
  })
  it('a fee above the absolute cap is Blocked', async () => {
    const big = record({ maxFeePerGas: String(300n * GWEI) })
    const { d, raws } = setup(big)
    const out = await runSpeedUp(big, await quoteSpeedUp(big, FROM, d.chain), FROM, d)
    expect(out.status).toBe('Blocked')
    expect(raws).toEqual([])
  })
  it('a chain error before the hash is known records nothing; an unclear submit records the hash and says Unknown', async () => {
    const a = setup()
    const approved = await quoteSpeedUp(record(), FROM, a.d.chain)
    a.d.chain = { ...a.d.chain, getSnapshot: () => Promise.reject(new Error('offline')) }
    expect((await runSpeedUp(record(), approved, FROM, a.d)).status).toBe('ChainError')
    expect(a.saved).toEqual([])
    const b = setup()
    b.d.chain = { ...b.d.chain, submit: () => Promise.reject(new Error('timeout')) }
    const out = await runSpeedUp(record(), approved, FROM, b.d)
    expect(out.status).toBe('Unknown')
    expect(b.saved[0]!.hashes).toHaveLength(2)
  })
  it('a failed save reports Unknown (the replacement was sent)', async () => {
    const { d } = setup()
    d.savePending = () => {
      throw new Error('kv')
    }
    const out = await runSpeedUp(record(), await quoteSpeedUp(record(), FROM, d.chain), FROM, d)
    expect(out.status).toBe('Unknown')
  })
})

describe('own hashes', () => {
  it('a record with one hash and no list reads as [hash]; the Etherscan hash is the mined one, else the latest', () => {
    const old = { hash: H1 }
    expect(ownHashes(old)).toEqual([H1])
    expect(explorerHash(old)).toBe(H1)
    const sped = { hash: H1, hashes: [H1, '0x2', '0x3'] }
    expect(explorerHash(sped)).toBe('0x3')
    expect(explorerHash({ ...sped, minedHash: H1 })).toBe(H1)
  })
})
