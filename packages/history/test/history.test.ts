import { describe, expect, it, vi } from 'vitest'
import { ApiError, type ApiErrorCode } from '@vaultme/api-client'
import { createHistory, parseDir, txView, type HistoryCache, type HistoryView, type LocalSend } from '../src/index.ts'

const ME = '0x' + 'a'.repeat(40)
const OTHER = '0x' + 'b'.repeat(40)
const H = '0x' + '1'.repeat(64)
const H2 = '0x' + '2'.repeat(64)
const upper = (s: string) => s.toUpperCase().replace('0X', '0x')

// HistoryItem of the API contract (ARCHITECTURE.md#history). `out` rows show the recipient, `in` rows the sender.
const row = (seq: number, direction: 'in' | 'out', o: { hash?: string } & Record<string, unknown> = {}) => ({
  id: `${o.hash ?? H}:${String(seq)}`,
  kind: 'native',
  hash: H,
  blockNumber: 1234567,
  txIndex: 0,
  timestamp: 1_000,
  direction,
  asset: 'ETH',
  value: '1000000000000000',
  from: direction === 'in' ? OTHER : ME,
  to: direction === 'in' ? ME : OTHER,
  status: 'ok',
  zeroValue: false,
  ...o,
})
const page = (items: unknown[]) => ({ items, nextCursor: null, incomplete: false })
const cacheOf = (items: unknown[], address = ME, updatedAt = 1): HistoryCache => ({
  address,
  json: JSON.stringify(page(items)),
  updatedAt,
})
const err = (code: ApiErrorCode, status = 500) => new ApiError(code, status, false, code)

const local: LocalSend = {
  hash: H2,
  asset: 'ETH',
  to: OTHER,
  amount: '0.05',
  createdAt: 5_000_000,
  state: 'Pending',
}

/** Fake page fetch + in-memory cache. `answer` is what the next fetch does. */
function setup(o: { cache?: HistoryCache | null; answer?: () => Promise<unknown>; now?: number } = {}) {
  let stored = o.cache ?? null
  let t = o.now ?? 42
  const fetchPage = vi.fn<(address: string, cursor?: string) => Promise<unknown>>(() =>
    (o.answer ?? (() => Promise.resolve(page([]))))(),
  )
  const h = createHistory({
    fetchPage,
    cache: { get: () => stored, set: (c) => void (stored = c) },
    now: () => t,
  })
  const views: HistoryView[] = []
  const load = h.list((v) => views.push(v))
  return {
    h,
    load,
    views,
    fetchPage,
    cache: () => stored,
    answer: (a: () => Promise<unknown>) => void (o.answer = a),
    setNow: (n: number) => void (t = n),
  }
}

describe('list (S40, ADR-0007)', () => {
  it('fresh first page: rows, update time, not failed; the page is cached for this address', async () => {
    const s = setup({ answer: () => Promise.resolve(page([row(0, 'in')])) })
    await s.load(ME)
    expect(s.fetchPage).toHaveBeenCalledWith(ME)
    expect(s.views).toEqual([
      {
        items: [
          {
            id: `${H}:0`,
            hash: H,
            kind: 'receive',
            asset: 'ETH',
            amount: '0.001',
            counterparty: OTHER,
            at: 1_000_000,
            status: 'confirmed',
            label: 'activity.confirmed',
            local: false,
            blockNumber: 1234567,
          },
        ],
        updatedAt: 42,
        failed: false,
      },
    ])
    expect(s.cache()).toEqual({ address: ME, json: JSON.stringify(page([row(0, 'in')])), updatedAt: 42 })
  })

  it('maps the contract: out shows the recipient, failed status, USDC units, contract creation has no counterparty', async () => {
    const s = setup({
      answer: () =>
        Promise.resolve(
          page([
            row(0, 'out', { status: 'failed' }),
            row(1, 'in', { asset: 'USDC', value: '2500000', kind: 'erc20' }),
            row(2, 'out', { to: null }),
          ]),
        ),
    })
    await s.load(ME)
    const [sent, usdc, created] = s.views[0]?.items ?? []
    expect(sent).toMatchObject({ kind: 'send', counterparty: OTHER, status: 'failed', label: 'activity.failed' })
    expect(usdc).toMatchObject({ kind: 'receive', asset: 'USDC', amount: '2.5' })
    expect(created?.counterparty).toBe('')
  })

  it('drops items that do not fit the contract (a newer server) and a body without items', async () => {
    const s = setup({
      answer: () => Promise.resolve(page([row(0, 'in'), { hash: 'x' }, null, row(1, 'in', { status: 'weird' })])),
    })
    await s.load(ME)
    expect(s.views[0]?.items).toHaveLength(1)
    s.answer(() => Promise.resolve(null))
    await s.load(ME)
    expect(s.views[1]?.items).toEqual([])
    s.answer(() => Promise.resolve({ items: 'no' }))
    await s.load(ME)
    expect(s.views[2]?.items).toEqual([])
  })

  it('address poisoning: an incoming zero-value row is hidden, an own zero-value call stays', async () => {
    const s = setup({
      answer: () =>
        Promise.resolve(
          page([row(0, 'in', { zeroValue: true, value: '0' }), row(1, 'out', { zeroValue: true, value: '0' })]),
        ),
    })
    await s.load(ME)
    expect(s.views[0]?.items.map((i) => i.id)).toEqual([`${H}:1`])
  })

  it('merges the local send: newest first, and it wins over an API row with the same hash', async () => {
    const s = setup({
      answer: () =>
        Promise.resolve(page([row(0, 'out', { hash: upper(H2), id: `${H2}:0` }), row(1, 'in', { timestamp: 9_000 })])),
    })
    await s.load(ME, local)
    expect(s.views[0]?.items).toMatchObject([
      { id: `${H}:1`, at: 9_000_000 },
      { id: H2, hash: H2, kind: 'send', counterparty: OTHER, amount: '0.05', status: 'pending', local: true },
    ])
    expect(s.views[0]?.items).toHaveLength(2)
  })

  it('a later failure shows the cache with its first update time, marked failed', async () => {
    const s = setup({ answer: () => Promise.resolve(page([row(0, 'in')])) })
    await s.load(ME)
    s.answer(() => Promise.reject(err('unavailable', 503)))
    s.setNow(9_000)
    await s.load(ME, local)
    expect(s.views[1]).toMatchObject({ updatedAt: 42, failed: true })
    expect(s.views[1]?.items.map((i) => i.id)).toEqual([H2, `${H}:0`])
  })

  it('failure without a cache of this address: only the local send, no update time', async () => {
    const s = setup({ cache: cacheOf([row(0, 'in')], OTHER), answer: () => Promise.reject(err('network', 0)) })
    await s.load(ME, local)
    expect(s.views).toEqual([{ items: [expect.objectContaining({ id: H2 })], updatedAt: null, failed: true }])
  })

  it('update_required, a non-API error or an unreadable cache: failed view, the cache is not shown', async () => {
    for (const e of [err('update_required', 426), new Error('boom')]) {
      const s = setup({ cache: cacheOf([row(0, 'in')]), answer: () => Promise.reject(e) })
      await s.load(ME)
      expect(s.views).toEqual([{ items: [], updatedAt: null, failed: true }])
    }
    const bad = setup({ cache: { address: ME, json: '{', updatedAt: 1 }, answer: () => Promise.reject(err('network')) })
    await bad.load(ME)
    expect(bad.views).toEqual([{ items: [], updatedAt: null, failed: true }])
  })

  it('404 (an API without /v1/history): only the local send, as fresh', async () => {
    const s = setup({ answer: () => Promise.reject(err('not_found', 404)) })
    await s.load(ME, local)
    expect(s.views).toEqual([{ items: [expect.objectContaining({ id: H2 })], updatedAt: 42, failed: false }])
  })

  it('no address (no API, kv unreadable): only the local send, no fetch', async () => {
    const s = setup()
    await s.load(null, local)
    await s.load(null)
    expect(s.fetchPage).not.toHaveBeenCalled()
    expect(s.views).toEqual([
      { items: [expect.objectContaining({ id: H2, local: true })], updatedAt: 42, failed: false },
      { items: [], updatedAt: 42, failed: false },
    ])
  })

  it('race guard: only the newest load of one list sets the view', async () => {
    const s = setup()
    let first!: (v: unknown) => void
    s.answer(() => new Promise((r) => (first = r)))
    const slow = s.load(ME)
    s.answer(() => Promise.resolve(page([row(1, 'in')])))
    await s.load(ME)
    first(page([row(0, 'in')]))
    await slow
    expect(s.views.map((v) => v.items.map((i) => i.id))).toEqual([[`${H}:1`]])
  })

  it('race guard: an old failure after a newer answer is dropped too; lists do not block each other', async () => {
    const s = setup()
    let fail!: (e: unknown) => void
    s.answer(() => new Promise((_, r) => (fail = r)))
    const slow = s.load(ME)
    const other: HistoryView[] = []
    const load2 = s.h.list((v) => other.push(v))
    s.answer(() => Promise.resolve(page([row(1, 'in')])))
    await load2(ME)
    await s.load(ME)
    fail(err('network'))
    await slow
    expect(s.views).toHaveLength(1)
    expect(other).toHaveLength(1)
  })
})

describe('cachedRow (S41 first render, no fetch)', () => {
  it('a row id is one exact movement, not all movements of the hash', () => {
    const { h } = setup({ cache: cacheOf([row(0, 'in'), row(1, 'out')]) })
    expect(h.cachedRow(ME, `${H}:1`)).toMatchObject({ id: `${H}:1`, kind: 'send', counterparty: OTHER })
    expect(h.cachedRow(ME, `${H}:0`)).toMatchObject({ kind: 'receive', counterparty: OTHER })
    expect(h.cachedRow(ME, `${H}:1`, 'in')).toMatchObject({ id: `${H}:1` }) // a row id is exact, whatever the push says
  })
  it('compares the account and the hash case-insensitively', () => {
    const { h } = setup({ cache: cacheOf([row(0, 'in')]) })
    expect(h.cachedRow(upper(ME), `${H}:0`)).not.toBeNull()
    expect(h.cachedRow(ME, upper(H))).toMatchObject({ id: `${H}:0` })
  })
  it('null: no cache, other account, no address, unknown id, bad json, several rows of a bare hash, other direction', () => {
    expect(setup().h.cachedRow(ME, `${H}:0`)).toBeNull()
    const { h } = setup({ cache: cacheOf([row(0, 'in')]) })
    expect(h.cachedRow(OTHER, `${H}:0`)).toBeNull()
    expect(h.cachedRow(null, `${H}:0`)).toBeNull()
    expect(h.cachedRow(ME, `${H}:9`)).toBeNull()
    expect(h.cachedRow(ME, H, 'out')).toBeNull()
    expect(setup({ cache: { address: ME, json: '{', updatedAt: 1 } }).h.cachedRow(ME, `${H}:0`)).toBeNull()
    expect(setup({ cache: cacheOf([row(0, 'in'), row(1, 'out')]) }).h.cachedRow(ME, H)).toBeNull()
  })
  it('the poisoning filter applies to S41 too', () => {
    const { h } = setup({ cache: cacheOf([row(0, 'in', { zeroValue: true, value: '0' })]) })
    expect(h.cachedRow(ME, `${H}:0`)).toBeNull()
  })
})

describe('findRow (S41 without a local record: cache, else a fresh first page)', () => {
  it('cached: exactly one row of the bare hash -> that row, no fetch', async () => {
    const s = setup({ cache: cacheOf([row(0, 'in')]) })
    expect(await s.h.findRow(ME, H)).toMatchObject({ status: 'row', row: { id: `${H}:0` } })
    expect(s.fetchPage).not.toHaveBeenCalled()
  })
  it('stale cache (the pushed tx is missing): a fresh page -> one row, and the cache now holds it', async () => {
    const s = setup({
      cache: cacheOf([row(5, 'out', { hash: H2 })]),
      answer: () => Promise.resolve(page([row(0, 'in')])),
    })
    expect(await s.h.findRow(ME, H)).toMatchObject({ status: 'row', row: { id: `${H}:0` } })
    expect(s.h.cachedRow(ME, `${H}:0`)).not.toBeNull()
  })
  it('fresh page: several rows -> several; none -> none; an unknown row id -> none', async () => {
    const two = setup({ answer: () => Promise.resolve(page([row(0, 'in'), row(1, 'out')])) })
    expect((await two.h.findRow(ME, H)).status).toBe('several')
    expect((await setup().h.findRow(ME, H)).status).toBe('none')
    const one = setup({ answer: () => Promise.resolve(page([row(0, 'in')])) })
    expect((await one.h.findRow(ME, `${H}:7`)).status).toBe('none')
  })
  it('push direction: picks the row of that direction; a cached row of the other direction is not shown', async () => {
    const both = page([row(0, 'in'), row(1, 'out')])
    const s = setup({ cache: cacheOf([row(0, 'in'), row(1, 'out')]), answer: () => Promise.resolve(both) })
    expect(await s.h.findRow(ME, H, 'in')).toMatchObject({ status: 'row', row: { id: `${H}:0`, kind: 'receive' } })
    expect(await s.h.findRow(ME, H, 'out')).toMatchObject({ status: 'row', row: { id: `${H}:1`, kind: 'send' } })
    expect(s.fetchPage).not.toHaveBeenCalled()
    const other = setup({ cache: cacheOf([row(0, 'in')]), answer: () => Promise.resolve(both) })
    expect(await other.h.findRow(ME, H, 'out')).toMatchObject({ status: 'row', row: { id: `${H}:1` } })
    expect(other.fetchPage).toHaveBeenCalledTimes(1)
    const twoIn = setup({ answer: () => Promise.resolve(page([row(0, 'in'), row(2, 'in')])) })
    expect((await twoIn.h.findRow(ME, H, 'in')).status).toBe('several')
    expect((await twoIn.h.findRow(ME, H, 'out')).status).toBe('none')
  })
  it('failed: no address, a fetch error, update_required, 404 or a cache fallback is never trusted', async () => {
    expect((await setup().h.findRow(null, H)).status).toBe('failed')
    for (const e of [new Error('x'), err('update_required', 426), err('not_found', 404), err('network')]) {
      const s = setup({ cache: cacheOf([row(5, 'out', { hash: H2 })]), answer: () => Promise.reject(e) })
      expect((await s.h.findRow(ME, H)).status).toBe('failed')
    }
  })
})

describe('parseDir', () => {
  it('accepts only in | out', () => {
    expect(parseDir('in')).toBe('in')
    expect(parseDir('out')).toBe('out')
    expect(parseDir('x')).toBeUndefined()
    expect(parseDir(undefined)).toBeUndefined()
  })
})

describe('txView', () => {
  it('maps each send state to its row status and label', () => {
    expect(txView('Pending')).toEqual({ status: 'pending', label: 'activity.pending' })
    expect(txView('Included')).toEqual({ status: 'pending', label: 'activity.included' })
    expect(txView('Confirmed')).toEqual({ status: 'confirmed', label: 'activity.confirmed' })
    expect(txView('Failed')).toEqual({ status: 'failed', label: 'activity.failed' })
    expect(txView('Replaced')).toEqual({ status: 'replaced', label: 'activity.replaced' })
    expect(txView('Unknown')).toEqual({ status: 'unknown', label: 'activity.unknown' })
  })
})
