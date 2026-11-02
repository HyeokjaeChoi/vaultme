import { fromUnits, txHash, type ChainSnapshot, type Hex } from '@vaultme/wallet-core'
import { Mnemonic } from '@vaultme/wallet-core/signer'
import { describe, expect, it, vi } from 'vitest'
import { explorerHash, ownHashes } from '../src/features/send/model/hashes'
import { canSpeedUp, quoteSpeedUp, runSpeedUp, type SpeedUpDeps } from '../src/features/send/model/speedUp'
import type { SentTx } from '../src/shared/chain/port'
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
  gasLimit: '21000',
  ...over,
})
// What the node says of a tx sent before the record saved its fees (an old original, priced above today's market).
const ORIGINAL: SentTx = { maxFeePerGas: 40n * GWEI, maxPriorityFeePerGas: 3n * GWEI, gasLimit: 65_000n }
const rpcError = (message: string) => Object.assign(new Error(message), { rpcCode: -32000 })
const old = (over: Partial<PendingTx> = {}): PendingTx => {
  const r = record(over)
  delete r.maxFeePerGas
  delete r.maxPriorityFeePerGas
  delete r.gasLimit
  return r
}

function setup(stored: PendingTx | null | 'corrupt' = record(), s = snap(), sent: SentTx | null = ORIGINAL) {
  const raws: Hex[] = []
  const saved: PendingTx[] = []
  const d: SpeedUpDeps = {
    chain: {
      broadcasts: true,
      getSnapshot: () => Promise.resolve(s),
      getTransaction: () => Promise.resolve(sent),
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
  it('a record saved before it kept fees and gas: the original tx is read from the chain by hash, not the market value', async () => {
    const { d } = setup()
    const spy = vi.spyOn(d.chain, 'getTransaction')
    const plan = await quoteSpeedUp(old(), FROM, d.chain)
    expect(spy).toHaveBeenCalledWith(H1)
    expect(plan.maxFeePerGas).toBe((40n * GWEI * 11n) / 10n + 1n) // 10 % over the ORIGINAL (40 gwei), far above the market (2.5 gwei)
    expect(plan.maxPriorityFeePerGas).toBe((3n * GWEI * 11n) / 10n + 1n)
    expect(plan.gasLimit).toBe(65_000n)
    expect(plan.currentFeeCap).toBe(65_000n * 40n * GWEI)
  })
  it('the saved gas limit is kept even when a fresh estimate is lower (an ERC-20 re-estimate can run out of gas)', async () => {
    const { d } = setup(record(), snap({ gasLimit: 50_000n }))
    const spy = vi.spyOn(d.chain, 'getTransaction')
    const plan = await quoteSpeedUp(record({ asset: 'USDC', amount: '1.5', gasLimit: '78000' }), FROM, d.chain)
    expect(plan.gasLimit).toBe(78_000n)
    expect(spy).not.toHaveBeenCalled() // fees and gas are on the record
  })
  it('a node that does not know the original of an old record is an error, not a bump from the market value', async () => {
    const { d } = setup(record(), snap(), null)
    await expect(quoteSpeedUp(old(), FROM, d.chain)).rejects.toThrow()
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
      gasLimit: '21000',
      fee: fromUnits(approved.estimatedFee, 'ETH'), // the displayed estimate follows the approved plan
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
  it('a plan above the absolute fee cap is Blocked before device auth', async () => {
    const big = record({ maxFeePerGas: String(300n * GWEI) })
    const { d, raws } = setup(big)
    const out = await runSpeedUp(big, await quoteSpeedUp(big, FROM, d.chain), FROM, d)
    expect(out.status).toBe('Blocked')
    expect(d.loadPhrase).not.toHaveBeenCalled()
    expect(raws).toEqual([])
  })
  it('a chain error before the hash is known records nothing', async () => {
    const a = setup()
    const approved = await quoteSpeedUp(record(), FROM, a.d.chain)
    a.d.chain = { ...a.d.chain, getSnapshot: () => Promise.reject(new Error('offline')) }
    expect((await runSpeedUp(record(), approved, FROM, a.d)).status).toBe('ChainError')
    expect(a.saved).toEqual([])
  })
  it('a definite node refusal (underpriced, nonce too low, insufficient funds) is a ChainError: nothing is recorded', async () => {
    for (const m of [
      'replacement transaction underpriced',
      'nonce too low',
      'insufficient funds for gas * price + value',
    ]) {
      const { d, saved } = setup()
      const approved = await quoteSpeedUp(record(), FROM, d.chain)
      d.chain = { ...d.chain, submit: () => Promise.reject(rpcError(m)) }
      const out = await runSpeedUp(record(), approved, FROM, d)
      expect(out.status).toBe('ChainError')
      expect(saved).toEqual([])
    }
  })
  it('an unclear submit (timeout, "already known") records the hash only: no speed-up claim, no new fees', async () => {
    for (const e of [new Error('timeout'), rpcError('already known')]) {
      const { d, saved } = setup()
      const approved = await quoteSpeedUp(record(), FROM, d.chain)
      d.chain = { ...d.chain, submit: () => Promise.reject(e) }
      const out = await runSpeedUp(record(), approved, FROM, d)
      expect(out.status).toBe('Unknown')
      expect(saved[0]!.hashes).toHaveLength(2)
      expect(saved[0]).toMatchObject({ state: 'Pending', maxFeePerGas: record().maxFeePerGas })
      expect(saved[0]!.kind).toBeUndefined()
    }
  })
  it('the record is read again before saving: a state a check wrote meanwhile is kept, the hash is added', async () => {
    const { d, saved } = setup()
    const approved = await quoteSpeedUp(record(), FROM, d.chain)
    const mined = record({ state: 'Included', minedHash: H1, blockNumber: 9 })
    let reads = 0
    d.readPending = () => (++reads === 1 ? record() : mined) // Pending before auth, Included after submit
    const out = await runSpeedUp(record(), approved, FROM, d)
    expect(out.status).toBe('NotPending')
    expect(saved[0]).toMatchObject({ state: 'Included', minedHash: H1, blockNumber: 9 })
    expect(saved[0]!.hashes).toHaveLength(2)
    expect(saved[0]!.kind).toBeUndefined()
    expect(saved[0]!.maxFeePerGas).toBe(record().maxFeePerGas)
  })
  it('the hash is appended to the latest hashes: another replacement saved meanwhile is not lost', async () => {
    const { d, saved } = setup()
    const approved = await quoteSpeedUp(record(), FROM, d.chain)
    const other = '0x' + '77'.repeat(32)
    let reads = 0
    d.readPending = () => (++reads === 1 ? record() : record({ hashes: [H1, other] }))
    await runSpeedUp(record(), approved, FROM, d)
    expect(saved[0]!.hashes).toEqual([H1, other, saved[0]!.hashes![2]])
    expect(saved[0]!.hashes).toHaveLength(3)
  })
  it('a failed save reports Unknown (the replacement was sent, nothing is claimed)', async () => {
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
