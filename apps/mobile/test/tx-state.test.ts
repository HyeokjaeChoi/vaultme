import { describe, expect, it, vi } from 'vitest'
import { FAKE_SETTLE_MS, checkTx, deriveState, fakeSettle, isFinal, isPolled, startPolling, type PollTimers } from '../src/features/send/model/txState'
import { txNotice, txView } from '../src/features/send/model/txView'
import type { Receipt } from '../src/shared/chain/port'
import type { PendingTx } from '../src/shared/storage/kv'

const tx = (state: PendingTx['state'], nonce = 5): PendingTx => ({ hash: '0x' + 'ab'.repeat(32), nonce, asset: 'ETH', to: '0x' + 'c'.repeat(40), amount: '1', createdAt: 1, lastCheckedAt: 1, state })
const ok = (n: bigint): Receipt => ({ status: 'success', blockNumber: n })
const bad = (n: bigint): Receipt => ({ status: 'reverted', blockNumber: n })

describe('deriveState (hld.md §4.1, Q37)', () => {
  const f = (over: Partial<Parameters<typeof deriveState>[0]>) => deriveState({ current: 'Pending', nonce: 5, receipt: null, safeBlock: null, safeNonce: null, ...over })
  it('receipt above the safe block = Included, success or reverted', () => {
    expect(f({ receipt: ok(101n), safeBlock: 100n })).toBe('Included')
    expect(f({ receipt: bad(101n), safeBlock: 100n })).toBe('Included')
  })
  it('receipt at or below the safe block: success = Confirmed, reverted = Failed', () => {
    expect(f({ receipt: ok(100n), safeBlock: 100n })).toBe('Confirmed')
    expect(f({ receipt: ok(7n), safeBlock: 100n })).toBe('Confirmed')
    expect(f({ receipt: bad(100n), safeBlock: 100n })).toBe('Failed')
  })
  it('no safe block known = never final', () => {
    expect(f({ receipt: ok(1n), safeBlock: null })).toBe('Included')
  })
  it('a reverted receipt is not Failed before safe', () => {
    expect(f({ current: 'Included', receipt: bad(101n), safeBlock: 100n })).toBe('Included')
  })
  it('Unknown becomes Included/Confirmed when a receipt shows up', () => {
    expect(f({ current: 'Unknown', receipt: ok(101n), safeBlock: 100n })).toBe('Included')
    expect(f({ current: 'Unknown', receipt: ok(90n), safeBlock: 100n })).toBe('Confirmed')
  })
  it('no receipt: time alone changes nothing, Pending and Unknown stay', () => {
    expect(f({})).toBe('Pending')
    expect(f({ current: 'Unknown' })).toBe('Unknown')
  })
  it('no receipt: safe nonce beyond ours = Replaced (Q77); equal or below is not', () => {
    expect(f({ safeNonce: 6n })).toBe('Replaced')
    expect(f({ current: 'Unknown', safeNonce: 9n })).toBe('Replaced')
    expect(f({ safeNonce: 5n })).toBe('Pending')
    expect(f({ safeNonce: 4n })).toBe('Pending')
  })
  it('Included whose receipt is gone (reorg) goes back to Pending', () => {
    expect(f({ current: 'Included' })).toBe('Pending')
  })
  it('final states never move', () => {
    for (const s of ['Confirmed', 'Failed', 'Replaced'] as const) expect(f({ current: s, receipt: bad(1n), safeBlock: 100n, safeNonce: 99n })).toBe(s)
  })
  it('only Pending and Included are polled; Confirmed, Failed, Replaced are final', () => {
    expect(['Pending', 'Included', 'Unknown', 'Confirmed', 'Failed', 'Replaced'].map((s) => isPolled(s as PendingTx['state']))).toEqual([true, true, false, false, false, false])
    expect(['Confirmed', 'Failed', 'Replaced', 'Pending'].map((s) => isFinal(s as PendingTx['state']))).toEqual([true, true, true, false])
  })
})

describe('checkTx', () => {
  const chain = (receipt: Receipt | null, safe = 100n, safeNonce = 0n, broadcasts = true) => ({
    broadcasts,
    getReceipt: vi.fn(async () => receipt),
    getSafeBlock: vi.fn(async () => safe),
    getSafeNonce: vi.fn(async () => safeNonce),
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
  it('a network failure throws, so the caller keeps the old record', async () => {
    const c = { ...chain(null), getReceipt: vi.fn(async () => { throw new Error('offline') }) }
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

describe('startPolling (15 s, stop conditions)', () => {
  function manual() {
    const jobs: { fn: () => void; ms: number; live: boolean }[] = []
    const timers: PollTimers = { set: (fn, ms) => { const j = { fn, ms, live: true }; jobs.push(j); return j }, clear: (h) => { if (h) (h as { live: boolean }).live = false } }
    const fire = async () => { const j = jobs.find((x) => x.live); if (!j) return false; j.live = false; j.fn(); await Promise.resolve(); await Promise.resolve(); return true }
    return { jobs, timers, fire }
  }
  it('checks at once, then every interval, never overlapping', async () => {
    const m = manual()
    const check = vi.fn(async () => 'Pending' as const)
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
      const check = vi.fn(async () => end)
      startPolling(check, 15_000, m.timers)
      await Promise.resolve()
      await Promise.resolve()
      expect(m.jobs.filter((j) => j.live)).toHaveLength(0)
      expect(check).toHaveBeenCalledTimes(1)
    }
  })
  it('keeps going after Included (not final) and after a failed check', async () => {
    const m = manual()
    const check = vi.fn<() => Promise<'Included'>>().mockRejectedValueOnce(new Error('offline')).mockResolvedValue('Included')
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
    const check = vi.fn(async () => 'Pending' as const)
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
    expect(fakeSettle(tx('Pending'), 1 + FAKE_SETTLE_MS - 1)).toMatchObject({ state: 'Pending', lastCheckedAt: FAKE_SETTLE_MS })
    expect(fakeSettle(tx('Pending'), 1 + FAKE_SETTLE_MS)).toMatchObject({ state: 'Confirmed', blockNumber: 5812044 })
  })
  it('other states do not move', () => {
    for (const s of ['Unknown', 'Failed', 'Replaced', 'Confirmed', 'Included'] as const) expect(fakeSettle(tx(s), 1e9).state).toBe(s)
  })
  it('checkTx on the fake adapter settles a Pending send without asking the network', async () => {
    const c = { broadcasts: false, getReceipt: vi.fn(), getSafeBlock: vi.fn(), getSafeNonce: vi.fn() }
    const out = await checkTx(tx('Pending'), c, ('0x' + '1'.repeat(40)) as `0x${string}`, () => 1 + FAKE_SETTLE_MS)
    expect(out.state).toBe('Confirmed')
    expect(c.getReceipt).not.toHaveBeenCalled()
  })
})
