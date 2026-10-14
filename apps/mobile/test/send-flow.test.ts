import { Mnemonic, prepare, type ChainSnapshot } from '@vaultme/wallet-core'
import { describe, expect, it, vi } from 'vitest'
import { blocksNewSend, runSend, type SendDeps } from '../src/features/send/model/runSend'
import { createFakeChain } from '../src/shared/chain/fake'
import type { PendingTx } from '../src/shared/storage'

// Published BIP39 test vector (all-zero entropy). Not a wallet phrase.
const VECTOR = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const TO = '0x9F3C7A210Bd4E6c855A13F90C2E78D16AB0441Ab'
const FROM = '0x1a2b3C4d5e6F7A8B9c0D1e2f3A4B5c6d7e8F9A0B'
const prompt = { title: 'auth', cancel: 'cancel' }

const base = async () => {
  const chain = createFakeChain({ get: () => 0, set: () => undefined })
  const snap = await chain.getSnapshot(FROM, 'ETH', TO, '0.05')
  const r = prepare({ asset: 'ETH', to: TO, amount: '0.05', previous: [] }, snap)
  if (!r.ok) throw new Error('prepare')
  return { review: r.review, snap }
}

function deps(over: Partial<SendDeps> & { snap?: ChainSnapshot } = {}) {
  let n = 0
  const saved: PendingTx[] = []
  const chain = over.chain ?? { broadcasts: false, getSnapshot: async () => over.snap!, submit: createFakeChain({ get: () => n, set: (v) => void (n = v) }).submit }
  const d: SendDeps = {
    chain,
    loadPhrase: vi.fn(async () => ({ status: 'ok' as const, mnemonic: new Mnemonic(VECTOR) })),
    readPending: () => null,
    savePending: (tx) => void saved.push(tx),
    now: () => 1000,
    prompt,
    ...over,
  }
  return { d, saved }
}

describe('runSend', () => {
  it('auth cancel signs nothing and stays silent', async () => {
    const { review, snap } = await base()
    const getSnapshot = vi.fn(async () => snap)
    const { d, saved } = deps({ loadPhrase: async () => ({ status: 'cancelled' }), chain: { broadcasts: false, getSnapshot, submit: vi.fn() } })
    expect(await runSend(review, '0.05', FROM, d)).toEqual({ status: 'Cancelled' })
    expect(getSnapshot).not.toHaveBeenCalled()
    expect(d.chain.submit).not.toHaveBeenCalled()
    expect(saved).toEqual([])
  })
  it('auth error is reported, nothing signed', async () => {
    const { review, snap } = await base()
    const { d } = deps({ snap, loadPhrase: async () => ({ status: 'error' }) })
    expect(await runSend(review, '0.05', FROM, d)).toEqual({ status: 'AuthError' })
  })
  it('Pending saves the record with the local hash, fee and nonce', async () => {
    const { review, snap } = await base()
    const { d, saved } = deps({ snap })
    const out = await runSend(review, '0.05', FROM, d)
    expect(out.status).toBe('Pending')
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ state: 'Pending', nonce: 0, asset: 'ETH', to: TO, amount: '0.05', fee: '0.000042', createdAt: 1000, lastCheckedAt: 1000 })
    expect(saved[0]!.hash).toMatch(/^0x[0-9a-f]{64}$/)
  })
  it('a savePending failure after submit is reported as Unknown, not thrown', async () => {
    const { review, snap } = await base()
    const { d } = deps({ snap, savePending: () => { throw new Error('kv') } })
    const out = await runSend(review, '0.05', FROM, d)
    expect(out.status).toBe('Unknown')
  })
  it('a submit that reports another hash is saved as Unknown', async () => {
    const { review, snap } = await base()
    const { d, saved } = deps({ snap, chain: { broadcasts: false, getSnapshot: async () => snap, submit: async () => `0x${'11'.repeat(32)}` } })
    expect((await runSend(review, '0.05', FROM, d)).status).toBe('Unknown')
    expect(saved[0]?.state).toBe('Unknown')
  })
  it('NeedsReview when the nonce moved or the fee cap rose; nothing saved', async () => {
    const { review, snap } = await base()
    const a = deps({ snap: { ...snap, nonce: 1 } })
    expect(await runSend(review, '0.05', FROM, a.d)).toEqual({ status: 'NeedsReview' })
    const b = deps({ snap: { ...snap, baseFeePerGas: snap.baseFeePerGas * 2n } })
    expect(await runSend(review, '0.05', FROM, b.d)).toEqual({ status: 'NeedsReview' })
    expect(a.saved.length + b.saved.length).toBe(0)
  })
  it('Blocked above the absolute fee cap', async () => {
    const { review, snap } = await base()
    const { d, saved } = deps({ snap: { ...snap, baseFeePerGas: 10n ** 13n } })
    expect(await runSend(review, '0.05', FROM, d)).toEqual({ status: 'Blocked' })
    expect(saved).toEqual([])
  })
  it('a snapshot failure is a ChainError', async () => {
    const { review } = await base()
    const { d } = deps({ chain: { broadcasts: false, getSnapshot: async () => { throw new Error('x') }, submit: vi.fn() } })
    expect(await runSend(review, '0.05', FROM, d)).toEqual({ status: 'ChainError' })
  })
  it('Q47: a Pending or Unknown or corrupt record blocks before any auth', async () => {
    const { review, snap } = await base()
    const tx = { hash: '0x1', nonce: 0, asset: 'ETH', to: TO, amount: '1', createdAt: 1, lastCheckedAt: 1 }
    for (const pending of [{ ...tx, state: 'Pending' as const }, { ...tx, state: 'Unknown' as const }, 'corrupt' as const]) {
      const { d } = deps({ snap, readPending: () => pending })
      expect(await runSend(review, '0.05', FROM, d)).toEqual({ status: 'PendingExists' })
      expect(d.loadPhrase).not.toHaveBeenCalled()
    }
    expect(blocksNewSend({ ...tx, state: 'Included' })).toBe(false)
    expect(blocksNewSend(null)).toBe(false)
  })
})
