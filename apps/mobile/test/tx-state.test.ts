import { describe, expect, it, vi } from 'vitest'
import {
  FAKE_SETTLE_MS,
  checkTx,
  fakeSettle,
  needsFacts,
  settleTx,
  startPolling,
  type PollTimers,
} from '../src/features/send/model/txState'
import { txNotice, txView } from '../src/entities/transaction/txView'
import type { Receipt } from '../src/shared/chain/port'
import type { PendingTx } from '../src/shared/storage/kv'

const tx = (state: PendingTx['state'], nonce = 5): PendingTx => ({
  hash: '0x' + 'ab'.repeat(32),
  nonce,
  asset: 'ETH',
  to: '0x' + 'c'.repeat(40),
  amount: '1',
  createdAt: 1,
  lastCheckedAt: 1,
  state,
})
const ok = (n: bigint): Receipt => ({ status: 'success', blockNumber: n })

describe('checkTx', () => {
  const chain = (receipt: Receipt | null, safe = 100n, safeNonce = 0n, broadcasts = true) => ({
    broadcasts,
    getReceipt: vi.fn<(h: string) => Promise<Receipt | null>>(() => Promise.resolve(receipt)),
    getSafeBlock: vi.fn(() => Promise.resolve(safe)),
    getSafeNonce: vi.fn(() => Promise.resolve(safeNonce)),
  })
  const FROM = ('0x' + '1'.repeat(40)) as `0x${string}`
  it('asks for the safe block only with a receipt, and the safe nonce only without one', async () => {
    const a = chain(ok(90n))
    expect((await checkTx(tx('Pending'), a, FROM, () => 9)).state).toBe('Confirmed')
    expect(a.getSafeBlock).toHaveBeenCalled()
    expect(a.getSafeNonce).not.toHaveBeenCalled()
    const b = chain(null, 100n, 6n)
    expect(await checkTx(tx('Pending'), b, FROM, () => 9)).toMatchObject({ state: 'Replaced', lastCheckedAt: 9 })
    expect(b.getSafeBlock).not.toHaveBeenCalled()
    expect(b.getSafeNonce).toHaveBeenCalledWith(FROM)
  })
  it('asks a receipt for every own hash, and the safe block only when one is mined', async () => {
    const c = chain(null)
    c.getReceipt.mockImplementation((h: string) => Promise.resolve(h === '0x2' ? ok(90n) : null))
    const sped = { ...tx('Pending'), hashes: [tx('Pending').hash, '0x2'] }
    expect((await checkTx(sped, c, FROM, () => 9)).state).toBe('Confirmed')
    expect(c.getReceipt).toHaveBeenCalledTimes(2)
    expect(c.getSafeNonce).not.toHaveBeenCalled()
  })
  it('a network failure throws, so the caller keeps the old record', async () => {
    const c = {
      ...chain(null),
      getReceipt: vi.fn(() => Promise.reject(new Error('offline'))),
    }
    await expect(checkTx(tx('Pending'), c, FROM, () => 9)).rejects.toThrow('offline')
  })
  it('the fake adapter only refreshes the checked time', async () => {
    const c = chain(null, 0n, 99n, false)
    expect(await checkTx(tx('Pending'), c, FROM, () => 9)).toMatchObject({ state: 'Pending', lastCheckedAt: 9 })
    expect(c.getReceipt).not.toHaveBeenCalled()
  })
  it('a final record is not asked again', async () => {
    const c = chain(ok(1n))
    expect((await checkTx(tx('Failed'), c, FROM, () => 9)).state).toBe('Failed')
    expect(c.getReceipt).not.toHaveBeenCalled()
  })
})

describe('settleTx (facts -> record, ADR-0006)', () => {
  const none = { hashes: ['0x'], receipts: [null], safeBlock: null, safeNonce: 0n }
  it('time alone moves nothing: no facts keeps every state, only lastCheckedAt moves', () => {
    for (const s of ['Pending', 'Included', 'Unknown', 'Confirmed', 'Failed', 'Replaced'] as const)
      expect(settleTx(tx(s), null, true, () => 9)).toMatchObject({ state: s, lastCheckedAt: 9 })
  })
  it('Unknown with the same facts as a poll moves only because a check asked (the caller decides when)', () => {
    expect(settleTx(tx('Unknown'), { ...none, receipts: [ok(90n)], safeBlock: 100n }, true, () => 9).state).toBe(
      'Confirmed',
    )
  })
  it('a receipt sets blockNumber; no receipt keeps the old one', () => {
    expect(settleTx(tx('Pending'), { ...none, receipts: [ok(90n)], safeBlock: 10n }, true, () => 9)).toMatchObject({
      state: 'Included',
      blockNumber: 90,
    })
    expect(settleTx({ ...tx('Included'), blockNumber: 7 }, none, true, () => 9).blockNumber).toBe(7)
  })
  it('a receipt for a replacement hash decides and names the mined hash (ADR-0031)', () => {
    const sped = { ...tx('Pending'), hashes: ['0x1', '0x2'], kind: 'speedUp' as const }
    const facts = { hashes: ['0x1', '0x2'], receipts: [null, ok(90n)], safeBlock: 100n, safeNonce: null }
    expect(settleTx(sped, facts, true, () => 9)).toMatchObject({
      state: 'Confirmed',
      blockNumber: 90,
      minedHash: '0x2',
    })
  })
  it('a mined original beats a replacement the node never ran', () => {
    const sped = { ...tx('Pending'), hashes: ['0x1', '0x2'] }
    const facts = { hashes: ['0x1', '0x2'], receipts: [ok(90n), null], safeBlock: 100n, safeNonce: null }
    expect(settleTx(sped, facts, true, () => 9)).toMatchObject({ state: 'Confirmed', minedHash: '0x1' })
  })
  it('no receipt for any own hash and a higher safe nonce = Replaced; below = still Pending', () => {
    const sped = { ...tx('Pending'), hashes: ['0x1', '0x2'] }
    const f = (safeNonce: bigint) => ({ hashes: ['0x1', '0x2'], receipts: [null, null], safeBlock: null, safeNonce })
    expect(settleTx(sped, f(6n), true, () => 9).state).toBe('Replaced')
    expect(settleTx(sped, f(5n), true, () => 9).state).toBe('Pending')
  })
  it('a mined cancel (kind cancel, last hash) at safe = Replaced and names the cancel hash; the original mined first is the normal state', () => {
    const base = { ...tx('Pending'), hashes: ['0x1', '0x2'], kind: 'cancel' as const }
    const hashes = ['0x1', '0x2']
    const f = (receipts: (Receipt | null)[]) => ({ hashes, receipts, safeBlock: 100n, safeNonce: null })
    expect(settleTx(base, f([null, ok(90n)]), true, () => 9)).toMatchObject({ state: 'Replaced', minedHash: '0x2' })
    expect(settleTx(base, f([ok(90n), null]), true, () => 9)).toMatchObject({ state: 'Confirmed', minedHash: '0x1' })
    expect(settleTx(base, f([null, ok(101n)]), true, () => 9).state).toBe('Pending') // above safe: no claim yet
  })
  it('only a polled, broadcast send asks the network', () => {
    expect(needsFacts(tx('Pending'), true)).toBe(true)
    expect(needsFacts(tx('Pending'), false)).toBe(false)
    expect(needsFacts(tx('Confirmed'), true)).toBe(false)
  })
})

describe('startPolling (15 s, stop conditions)', () => {
  function manual() {
    const jobs: { fn: () => void; ms: number; live: boolean }[] = []
    const timers: PollTimers = {
      set: (fn, ms) => {
        const j = { fn, ms, live: true }
        jobs.push(j)
        return j
      },
      clear: (h) => {
        if (h) (h as { live: boolean }).live = false
      },
    }
    const fire = async () => {
      const j = jobs.find((x) => x.live)
      if (!j) return false
      j.live = false
      j.fn()
      await Promise.resolve()
      await Promise.resolve()
      return true
    }
    return { jobs, timers, fire }
  }
  it('checks at once, then every interval, never overlapping', async () => {
    const m = manual()
    const check = vi.fn(() => Promise.resolve('Pending' as const))
    startPolling(check, 15_000, m.timers)
    await Promise.resolve()
    expect(check).toHaveBeenCalledTimes(1)
    expect(m.jobs.at(-1)?.ms).toBe(15_000)
    await m.fire()
    expect(check).toHaveBeenCalledTimes(2)
  })
  it('stops by itself at a final state and at Unknown', async () => {
    for (const end of ['Confirmed', 'Failed', 'Replaced', 'Unknown'] as const) {
      const m = manual()
      const check = vi.fn(() => Promise.resolve(end))
      startPolling(check, 15_000, m.timers)
      await Promise.resolve()
      await Promise.resolve()
      expect(m.jobs.filter((j) => j.live)).toHaveLength(0)
      expect(check).toHaveBeenCalledTimes(1)
    }
  })
  it('keeps going after Included (not final) and after a failed check', async () => {
    const m = manual()
    const check = vi
      .fn<() => Promise<'Included'>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue('Included')
    startPolling(check, 15_000, m.timers)
    await Promise.resolve()
    await Promise.resolve()
    expect(m.jobs.filter((j) => j.live)).toHaveLength(1)
    await m.fire()
    expect(check).toHaveBeenCalledTimes(2)
    expect(m.jobs.filter((j) => j.live)).toHaveLength(1)
  })
  it('stop() (blur or background) cancels the next tick, also when a check is in flight', async () => {
    const m = manual()
    let release: (s: 'Pending') => void = () => undefined
    const check = vi.fn(() => new Promise<'Pending'>((r) => (release = r)))
    const stop = startPolling(check, 15_000, m.timers)
    stop()
    release('Pending')
    await Promise.resolve()
    await Promise.resolve()
    expect(m.jobs.filter((j) => j.live)).toHaveLength(0)
  })
  it('works with real fake timers', async () => {
    vi.useFakeTimers()
    const check = vi.fn(() => Promise.resolve('Pending' as const))
    const stop = startPolling(check, 15_000)
    await vi.advanceTimersByTimeAsync(0)
    expect(check).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(14_999)
    expect(check).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(check).toHaveBeenCalledTimes(2)
    stop()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(check).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})

describe('txView / txNotice', () => {
  it('maps every state to an icon status, label and notice', () => {
    expect(txView('Pending')).toEqual({ status: 'pending', label: 'activity.pending' })
    expect(txView('Included')).toEqual({ status: 'pending', label: 'activity.included' })
    expect(txView('Confirmed').status).toBe('confirmed')
    expect(txView('Failed').status).toBe('failed')
    expect(txView('Unknown').status).toBe('unknown')
    expect(txView('Replaced')).toEqual({ status: 'replaced', label: 'activity.replaced' })
    expect(txNotice('Unknown').tone).toBe('unknown')
    expect(txNotice('Failed').tone).toBe('danger')
  })
})

describe('fakeSettle (test-data mode)', () => {
  it('a Pending send stays Pending until the settle time, then Confirmed with a block', () => {
    expect(fakeSettle(tx('Pending'), 1 + FAKE_SETTLE_MS - 1)).toMatchObject({
      state: 'Pending',
      lastCheckedAt: FAKE_SETTLE_MS,
    })
    expect(fakeSettle(tx('Pending'), 1 + FAKE_SETTLE_MS)).toMatchObject({ state: 'Confirmed', blockNumber: 5812044 })
  })
  it('other states do not move', () => {
    for (const s of ['Unknown', 'Failed', 'Replaced', 'Confirmed', 'Included'] as const)
      expect(fakeSettle(tx(s), 1e9).state).toBe(s)
  })
  it('checkTx on the fake adapter settles a Pending send without asking the network', async () => {
    const c = { broadcasts: false, getReceipt: vi.fn(), getSafeBlock: vi.fn(), getSafeNonce: vi.fn() }
    const out = await checkTx(tx('Pending'), c, ('0x' + '1'.repeat(40)) as `0x${string}`, () => 1 + FAKE_SETTLE_MS)
    expect(out.state).toBe('Confirmed')
    expect(c.getReceipt).not.toHaveBeenCalled()
  })
})
