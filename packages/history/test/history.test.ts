import { describe, expect, it, vi } from 'vitest'
import { ApiError, type ApiErrorCode } from '@vaultme/api-client'
import { createHistory, txView, type HistoryCache, type HistoryView, type LocalSend } from '../src/index.ts'

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
function setup(
  o: { cache?: HistoryCache | null; answer?: () => Promise<unknown>; now?: number; showZero?: () => boolean } = {},
) {
  let stored = o.cache ?? null
  let t = o.now ?? 42
  const fetchPage = vi.fn<(address: string, cursor?: string) => Promise<unknown>>(() =>
    (o.answer ?? (() => Promise.resolve(page([]))))(),
  )
  const h = createHistory({
    fetchPage,
    cache: { get: () => stored, set: (c) => void (stored = c) },
    now: () => t,
    ...(o.showZero ? { showZero: o.showZero } : {}),
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
        nextCursor: null,
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
    expect(s.views).toEqual([
      { items: [expect.objectContaining({ id: H2 })], updatedAt: null, failed: true, nextCursor: null },
    ])
  })

  it('update_required, a non-API error or an unreadable cache: failed view, the cache is not shown', async () => {
    for (const e of [err('update_required', 426), new Error('boom')]) {
      const s = setup({ cache: cacheOf([row(0, 'in')]), answer: () => Promise.reject(e) })
      await s.load(ME)
      expect(s.views).toEqual([{ items: [], updatedAt: null, failed: true, nextCursor: null }])
    }
    const bad = setup({ cache: { address: ME, json: '{', updatedAt: 1 }, answer: () => Promise.reject(err('network')) })
    await bad.load(ME)
    expect(bad.views).toEqual([{ items: [], updatedAt: null, failed: true, nextCursor: null }])
  })

  it('404 (an API without /v1/history): only the local send, as fresh', async () => {
    const s = setup({ answer: () => Promise.reject(err('not_found', 404)) })
    await s.load(ME, local)
    expect(s.views).toEqual([
      { items: [expect.objectContaining({ id: H2 })], updatedAt: 42, failed: false, nextCursor: null },
    ])
  })

  it('no address (no API, kv unreadable): only the local send, no fetch', async () => {
    const s = setup()
    await s.load(null, local)
    await s.load(null)
    expect(s.fetchPage).not.toHaveBeenCalled()
    expect(s.views).toEqual([
      { items: [expect.objectContaining({ id: H2, local: true })], updatedAt: 42, failed: false, nextCursor: null },
      { items: [], updatedAt: 42, failed: false, nextCursor: null },
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

describe('timestamps that cannot be dates', () => {
  it('a row whose time is beyond the Date range is dropped, so a client can format every row it gets', async () => {
    const s = setup({ answer: () => Promise.resolve(page([row(0, 'in', { timestamp: 9e15 }), row(1, 'in')])) })
    await s.load(ME)
    expect(s.views[0]?.items.map((i) => i.id)).toEqual([`${H}:1`])
  })
})

describe('view (one fresh view, for a caller that orders its own loads)', () => {
  it('returns the same view `list` would pass on: fresh, cache with failed, or only the local send', async () => {
    const ok = setup({ answer: () => Promise.resolve(page([row(0, 'in')])) })
    expect(await ok.h.view(ME, local)).toMatchObject({ failed: false, items: [{ id: local.hash }, { id: `${H}:0` }] })
    const bad = setup({ cache: cacheOf([row(0, 'in')]), answer: () => Promise.reject(err('network', 0)) })
    expect(await bad.h.view(ME, null)).toMatchObject({ failed: true, items: [{ id: `${H}:0` }] })
    const none = setup({ answer: () => Promise.reject(err('network', 0)) })
    expect(await none.h.view(ME, local)).toMatchObject({ failed: true, updatedAt: null, items: [{ id: local.hash }] })
  })
})

describe('older pages (web 더 보기)', () => {
  const withCursor = (items: unknown[], nextCursor: string | null) => ({ items, nextCursor, incomplete: false })

  it('the first view carries the cursor of the next page; the cache fallback and the local-only view carry none', async () => {
    const s = setup({ answer: () => Promise.resolve(withCursor([row(0, 'in')], 'c1')) })
    await s.load(ME)
    expect(s.views[0]?.nextCursor).toBe('c1')
    s.answer(() => Promise.reject(err('network')))
    await s.load(ME)
    expect(s.views[1]).toMatchObject({ failed: true, nextCursor: null })
  })

  it('more: asks for that cursor, returns the next rows with the same poisoning filter, and does not touch the cache', async () => {
    const s = setup({ cache: cacheOf([row(0, 'in')]) })
    s.fetchPage.mockResolvedValueOnce(
      withCursor([row(1, 'in', { zeroValue: true, value: '0' }), row(2, 'out', { zeroValue: true, value: '0' })], 'c2'),
    )
    const r = await s.h.more(ME, 'c1')
    expect(s.fetchPage).toHaveBeenCalledWith(ME, 'c1')
    expect(r?.items.map((i) => i.id)).toEqual([`${H}:2`])
    expect(r?.nextCursor).toBe('c2')
    expect(s.cache()).toEqual(cacheOf([row(0, 'in')]))
  })

  it('more: the last page has no cursor; any error (also update_required) is null, never a throw', async () => {
    const s = setup()
    s.fetchPage.mockResolvedValueOnce(withCursor([], null))
    expect(await s.h.more(ME, 'c1')).toEqual({ items: [], nextCursor: null })
    s.fetchPage.mockRejectedValueOnce(err('update_required', 426))
    expect(await s.h.more(ME, 'c1')).toBeNull()
    s.fetchPage.mockRejectedValueOnce(new Error('offline'))
    expect(await s.h.more(ME, 'c1')).toBeNull()
  })
})

describe('cachedRow (S41 first render, no fetch)', () => {
  it('a row id is one exact movement, not all movements of the hash', () => {
    const { h } = setup({ cache: cacheOf([row(0, 'in'), row(1, 'out')]) })
    expect(h.cachedRow(ME, `${H}:1`)).toMatchObject({ id: `${H}:1`, kind: 'send', counterparty: OTHER })
    expect(h.cachedRow(ME, `${H}:0`)).toMatchObject({ kind: 'receive', counterparty: OTHER })
  })
  it('compares the account and the hash case-insensitively', () => {
    const { h } = setup({ cache: cacheOf([row(0, 'in')]) })
    expect(h.cachedRow(upper(ME), `${H}:0`)).not.toBeNull()
    expect(h.cachedRow(ME, upper(H))).toMatchObject({ id: `${H}:0` })
  })
  it('null: no cache, other account, no address, unknown id, bad json, several rows of a bare hash', () => {
    expect(setup().h.cachedRow(ME, `${H}:0`)).toBeNull()
    const { h } = setup({ cache: cacheOf([row(0, 'in')]) })
    expect(h.cachedRow(OTHER, `${H}:0`)).toBeNull()
    expect(h.cachedRow(null, `${H}:0`)).toBeNull()
    expect(h.cachedRow(ME, `${H}:9`)).toBeNull()
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
  it('failed: no address, a fetch error, update_required, 404 or a cache fallback is never trusted', async () => {
    expect((await setup().h.findRow(null, H)).status).toBe('failed')
    for (const e of [new Error('x'), err('update_required', 426), err('not_found', 404), err('network')]) {
      const s = setup({ cache: cacheOf([row(5, 'out', { hash: H2 })]), answer: () => Promise.reject(e) })
      expect((await s.h.findRow(ME, H)).status).toBe('failed')
    }
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

describe('zero-value switch (Q71, S63)', () => {
  const zero = (seq: number, direction: 'in' | 'out') => row(seq, direction, { zeroValue: true, value: '0' })
  let on = false
  const shown = () => on
  const withSwitch = (o: Parameters<typeof setup>[0] = {}) => setup({ ...o, showZero: shown })

  it('off (the default): an incoming zero-value row is hidden in the list, in a cached row and in a lookup', async () => {
    on = false
    const s = withSwitch({ answer: () => Promise.resolve(page([zero(0, 'in'), row(1, 'in')])) })
    await s.load(ME)
    expect(s.views[0]?.items.map((i) => i.id)).toEqual([`${H}:1`])
    expect(s.h.cachedRow(ME, `${H}:0`)).toBeNull()
    expect(await s.h.findRow(ME, `${H}:0`)).toEqual({ status: 'none' })
    const web = setup({ answer: () => Promise.resolve(page([zero(0, 'in')])) }) // no `showZero` dep = hidden (web viewer)
    await web.load(ME)
    expect(web.views[0]?.items).toEqual([])
  })

  it('on: the incoming zero-value row shows with caution; other rows carry no caution; own zero-value calls stay as before', async () => {
    on = true
    const s = withSwitch({ answer: () => Promise.resolve(page([zero(0, 'in'), zero(1, 'out'), row(2, 'in')])) })
    await s.load(ME)
    const items = s.views[0]?.items ?? []
    expect(items.map((i) => [i.id, i.caution ?? false])).toEqual([
      [`${H}:0`, true],
      [`${H}:1`, false],
      [`${H}:2`, false],
    ])
    expect(items.find((i) => i.id === `${H}:0`)).toMatchObject({ kind: 'receive', amount: '0' })
  })

  it('the cache keeps the raw page: flipping the switch changes what S41 finds, no refetch needed for a cached row', async () => {
    on = false
    const s = withSwitch({ cache: cacheOf([zero(0, 'in')]) })
    expect(s.h.cachedRow(ME, `${H}:0`)).toBeNull()
    on = true
    expect(s.h.cachedRow(ME, `${H}:0`)).toMatchObject({ id: `${H}:0`, caution: true })
    expect(await s.h.findRow(ME, H)).toMatchObject({ status: 'row', row: { caution: true } })
    expect(s.fetchPage).not.toHaveBeenCalled()
  })

  it('more() uses the same switch', async () => {
    on = true
    const s = withSwitch({ answer: () => Promise.resolve(page([zero(0, 'in')])) })
    expect((await s.h.more(ME, 'c'))?.items[0]).toMatchObject({ caution: true })
    on = false
    expect((await s.h.more(ME, 'c'))?.items).toEqual([])
  })

  it('a flip while a page loads does not change how that answer is parsed', async () => {
    on = false
    let release: (v: unknown) => void = () => undefined
    const s = withSwitch({ answer: () => new Promise((r) => (release = r)) })
    const loading = s.load(ME)
    on = true
    release(page([zero(0, 'in')]))
    await loading
    expect(s.views[0]?.items).toEqual([]) // parsed with the value read when the load started (off)
  })
})
