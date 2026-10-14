import { describe, expect, it } from 'vitest'
import { failedView, parseItems, toView } from '../src/features/history/model/view'
import { apiErrorKey } from '../src/shared/api/errorCopy'
import { ApiError } from '../src/shared/api/errors'
import { createHistory } from '../src/shared/api/history'
import { dayGroup, formatUpdated } from '../src/shared/lib/time'
import type { HistoryCache, PendingTx } from '../src/shared/storage/kv'

const A = '0x' + 'a'.repeat(40)
const H1 = '0x' + '1'.repeat(64)
const H2 = '0x' + '2'.repeat(64)
const local: PendingTx = { hash: H1, nonce: 0, asset: 'ETH', to: A, amount: '0.05', createdAt: 5_000_000, lastCheckedAt: 1, state: 'Pending' }
const item = (hash: string, timestamp: number, status = 'confirmed') => ({ hash, kind: 'receive', asset: 'ETH', amount: '0.2', counterparty: A, timestamp, status })

describe('history view (Q58)', () => {
  it('parses provisional items and drops what it does not understand', () => {
    expect(parseItems({ items: [item(H2, 100), { hash: 'x' }, null, item(H2, 100, 'weird')] })).toHaveLength(1)
    expect(parseItems(undefined)).toEqual([])
    expect(parseItems({ items: 'no' })).toEqual([])
    expect(parseItems({ items: [item(H2, 100)] })[0]).toMatchObject({ at: 100_000, status: 'confirmed', label: 'activity.confirmed', local: false })
  })
  it('api result: updatedAt is the fetch time, not failed; the local send wins over the same hash and sorts newest first', () => {
    const v = toView({ source: 'api', data: { items: [item(H1, 1), item(H2, 9000)] }, updatedAt: 777 }, local, 99)
    expect(v).toMatchObject({ updatedAt: 777, failed: false })
    expect(v.items.map((i) => [i.hash, i.local])).toEqual([[H2, false], [H1, true]])
  })
  it('cache result: keeps the old update time and says it failed', () => {
    const v = toView({ source: 'cache', data: { items: [item(H2, 10)] }, updatedAt: 123, error: new ApiError('network', 0, true, 'x') }, null, 999)
    expect(v).toMatchObject({ updatedAt: 123, failed: true })
    expect(v.items).toHaveLength(1)
  })
  it('404 (no history API yet): only what this device sent, updated now', () => {
    const v = toView({ source: 'local', sent: [] }, local, 555)
    expect(v).toMatchObject({ updatedAt: 555, failed: false })
    expect(v.items.map((i) => i.hash)).toEqual([H1])
  })
  it('empty when nothing came back and nothing was sent', () => {
    expect(toView({ source: 'api', data: { items: [] }, updatedAt: 1 }, null, 1).items).toEqual([])
  })
  it('no answer and no cache: failed, no update time, still shows the local send', () => {
    expect(failedView(local)).toMatchObject({ updatedAt: null, failed: true })
    expect(failedView(local).items).toHaveLength(1)
  })
  it('end to end with the adapter: a failure after a success shows the cache with the first update time', async () => {
    let cache: HistoryCache | null = null
    let t = 1_000
    let fail = false
    const h = createHistory({
      fetchPage: async () => { if (fail) throw new ApiError('unavailable', 503, true, 'x'); return { items: [item(H2, 50)] } },
      cache: { get: () => cache, set: (c) => void (cache = c) },
      local: () => [],
      now: () => t,
    })
    expect(toView(await h.load(A), null, t)).toMatchObject({ updatedAt: 1_000, failed: false })
    fail = true
    t = 9_000
    expect(toView(await h.load(A), null, t)).toMatchObject({ updatedAt: 1_000, failed: true })
  })
})

describe('time labels', () => {
  const now = new Date(2026, 9, 14, 12, 0).getTime()
  it('today = HH:mm, other days = M월 D일 HH:mm', () => {
    expect(formatUpdated(new Date(2026, 9, 14, 9, 5).getTime(), now)).toBe('09:05')
    expect(formatUpdated(new Date(2026, 9, 13, 9, 12).getTime(), now)).toBe('10월 13일 09:12')
    expect(dayGroup(new Date(2026, 9, 14, 1, 0).getTime(), now)).toBe('today')
    expect(dayGroup(new Date(2026, 9, 12, 1, 0).getTime(), now)).toBe('10월 12일')
  })
})

describe('apiErrorKey', () => {
  const e = (code: ConstructorParameters<typeof ApiError>[0]) => new ApiError(code, 0, false, code)
  it('picks the copy by cause; unknown causes get the generic line', () => {
    expect(apiErrorKey(e('network'))).toBe('apiError.network')
    expect(apiErrorKey(e('unavailable'))).toBe('apiError.unavailable')
    expect(apiErrorKey(e('rate_limited'))).toBe('apiError.unavailable')
    expect(apiErrorKey(e('clock_skew'))).toBe('apiError.clockSkew')
    expect(apiErrorKey(e('Unknown'))).toBe('send.chainError')
    expect(apiErrorKey(new Error('x'))).toBe('send.chainError')
  })
})
