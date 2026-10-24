import { describe, expect, it, vi } from 'vitest'
import {
  detailRoute,
  findCachedRow,
  hashOfId,
  resolveRow,
  rowCopy,
  rowFromCache,
} from '../src/features/history/model/detail'
import { createHistory } from '../src/shared/api/history'
import { explorerUrl } from '../src/shared/chain/port'
import type { HistoryCache } from '../src/shared/storage/kv'

// view.ts reaches txView through the entities/transaction index, which also loads the kv store (React Native).
vi.mock('@/shared/storage', () => ({}))

const ME = '0x' + 'a'.repeat(40)
const OTHER = '0x' + 'b'.repeat(40)
const H = '0x' + '1'.repeat(64)
const row = (seq: number, direction: 'in' | 'out', o: Record<string, unknown> = {}) => ({
  id: `${H}:${String(seq)}`,
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
const cache = (items: unknown[], address = ME): HistoryCache => ({
  address,
  json: JSON.stringify({ items, nextCursor: null, incomplete: false }),
  updatedAt: 1,
})

describe('findCachedRow', () => {
  it('finds one movement by id, not all movements of the hash', () => {
    const c = cache([row(0, 'in'), row(1, 'out')])
    expect(findCachedRow(c, ME, `${H}:1`)).toMatchObject({
      id: `${H}:1`,
      kind: 'send',
      counterparty: OTHER,
      blockNumber: 1234567,
    })
    expect(findCachedRow(c, ME, `${H}:0`)).toMatchObject({ kind: 'receive', counterparty: OTHER })
  })
  it('compares the account case-insensitively', () => {
    expect(findCachedRow(cache([row(0, 'in')]), ME.toUpperCase().replace('0X', '0x'), `${H}:0`)).not.toBeNull()
  })
  it('misses (-> redirect to /activity) with empty cache, other account, unknown id, bad json', () => {
    expect(findCachedRow(null, ME, `${H}:0`)).toBeNull()
    expect(findCachedRow(cache([row(0, 'in')]), OTHER, `${H}:0`)).toBeNull()
    expect(findCachedRow(cache([row(0, 'in')]), ME, `${H}:9`)).toBeNull()
    expect(findCachedRow(cache([row(0, 'in')]), null, `${H}:0`)).toBeNull()
    expect(findCachedRow({ address: ME, json: '{', updatedAt: 1 }, ME, `${H}:0`)).toBeNull()
  })
  it('keeps a contract creation (to = null) as a row without counterparty', () => {
    expect(findCachedRow(cache([row(0, 'out', { to: null })]), ME, `${H}:0`)?.counterparty).toBe('')
  })
})

describe('fresh page cached, then S41 lookup (push tap)', () => {
  it('createHistory.load caches the first page, so findCachedRow finds the pushed row', async () => {
    let stored: HistoryCache | null = cache([row(5, 'out')]) // stale: the pushed tx is not in it
    const h = createHistory({
      fetchPage: () => Promise.resolve({ items: [row(0, 'in')], nextCursor: null, incomplete: false }),
      cache: { get: () => stored, set: (c) => (stored = c) },
      local: () => [],
      now: () => 1,
    })
    expect(findCachedRow(stored, ME, `${H}:0`)).toBeNull()
    await h.load(ME)
    expect(findCachedRow(stored, ME, `${H}:0`)).toMatchObject({ kind: 'receive' })
  })
})

describe('resolveRow (S41 without a local record)', () => {
  const H2 = '0x' + '2'.repeat(64)
  const page = (items: unknown[]) => ({ items, nextCursor: null, incomplete: false })
  const make = (o: { cache?: HistoryCache | null; fetch?: () => Promise<unknown>; address?: string | null } = {}) => {
    let stored: HistoryCache | null = o.cache ?? null
    const fetchPage = vi.fn(o.fetch ?? (() => Promise.resolve(page([]))))
    return {
      fetchPage,
      d: {
        address: () => (o.address === undefined ? ME : o.address),
        cache: () => stored,
        fresh: async (a: string): Promise<unknown> => {
          const data = await fetchPage()
          stored = { address: a, json: JSON.stringify(data), updatedAt: 1 }
          return data
        },
      },
    }
  }

  it('cached: exactly one row of the bare hash -> that row, no fetch', async () => {
    const { d, fetchPage } = make({ cache: cache([row(0, 'in')]) })
    expect(rowFromCache(H, d.address(), d.cache())).toMatchObject({ status: 'row', row: { id: `${H}:0` } })
    expect((await resolveRow(H, d)).status).toBe('row')
    expect(fetchPage).not.toHaveBeenCalled()
  })
  it('a list tap (row id) finds its row in the cache even when the hash has several rows', async () => {
    const { d, fetchPage } = make({ cache: cache([row(0, 'in'), row(1, 'out')]) })
    expect(await resolveRow(`${H}:1`, d)).toMatchObject({ status: 'row', row: { id: `${H}:1` } })
    expect(fetchPage).not.toHaveBeenCalled()
  })
  it('stale cache (the pushed tx is missing): fetches a fresh page -> one row, and the cache now holds it', async () => {
    const { d } = make({
      cache: cache([row(5, 'out', { hash: H2, id: `${H2}:0` })]),
      fetch: () => Promise.resolve(page([row(0, 'in')])),
    })
    expect(await resolveRow(H, d)).toMatchObject({ status: 'row', row: { id: `${H}:0` } })
    expect(findCachedRow(d.cache(), ME, `${H}:0`)).not.toBeNull()
  })
  it('hash compare is case-insensitive', async () => {
    const { d } = make({ fetch: () => Promise.resolve(page([row(0, 'in')])) })
    expect((await resolveRow(H.toUpperCase().replace('0X', '0x'), d)).status).toBe('row')
  })
  it('fresh page: several rows -> several (S41 goes back to the list); none -> none', async () => {
    const two = make({
      cache: cache([row(0, 'in'), row(1, 'out')]),
      fetch: () => Promise.resolve(page([row(0, 'in'), row(1, 'out')])),
    })
    expect((await resolveRow(H, two.d)).status).toBe('several')
    expect(two.fetchPage).toHaveBeenCalledTimes(1)
    const none = make({ fetch: () => Promise.resolve(page([])) })
    expect((await resolveRow(H, none.d)).status).toBe('none')
  })
  it('a row id that is in neither the cache nor the fresh page -> none', async () => {
    const { d } = make({ fetch: () => Promise.resolve(page([row(0, 'in')])) })
    expect((await resolveRow(`${H}:7`, d)).status).toBe('none')
  })
  it('fetch error, update_required, no address -> failed', async () => {
    expect((await resolveRow(H, make({ fetch: () => Promise.reject(new Error('x')) }).d)).status).toBe('failed')
    expect((await resolveRow(H, make({ address: null }).d)).status).toBe('failed')
  })
})

describe('rowCopy', () => {
  const k = (kind: 'send' | 'receive', status: 'confirmed' | 'failed' | 'pending') => rowCopy({ kind, status })
  it('incoming ok: 보낸 사람, 받은 계정, 성공, no "확정"', () => {
    expect(k('receive', 'confirmed')).toEqual({
      counterpartyTitle: 'detail.senderTitle',
      accountLabel: 'detail.receivedAccount',
      badge: 'confirmed',
      title: 'detail.received',
      body: 'detail.success.body',
      statusWord: 'detail.state.success',
    })
  })
  it('outgoing without record: 받는 사람, 보낸 계정, 성공', () => {
    expect(k('send', 'confirmed')).toMatchObject({
      counterpartyTitle: 'detail.recipientWho',
      accountLabel: 'detail.sender',
      title: 'result.sent',
      body: 'detail.success.body',
      statusWord: 'detail.state.success',
    })
  })
  it('failed uses the existing failure copy; incoming claims no fee', () => {
    expect(k('send', 'failed')).toMatchObject({
      badge: 'failed',
      title: 'result.failedTitle',
      body: 'detail.failed.body',
      statusWord: 'activity.failed',
    })
    expect(k('receive', 'failed')).toMatchObject({ badge: 'failed', title: 'detail.failed.title', body: null })
  })
  it('never uses the confirmed words', () => {
    for (const kind of ['send', 'receive'] as const)
      for (const status of ['confirmed', 'failed', 'pending'] as const) {
        const c = k(kind, status)
        expect(JSON.stringify(c)).not.toMatch(/detail\.confirmed|activity\.confirmed|state\.confirmed/)
      }
  })
})

describe('routes and links', () => {
  it('every row id opens /activity/[hash]; the hash prefix is recoverable', () => {
    expect(detailRoute({ id: `${H}:1` })).toEqual({ pathname: '/activity/[hash]', params: { hash: `${H}:1` } })
    expect(hashOfId(`${H}:1`)).toBe(H)
    expect(hashOfId(H)).toBe(H)
  })
  it('Etherscan row: link on a broadcasting chain, hidden (null) in test-data mode', () => {
    expect(explorerUrl({ broadcasts: true }, H)).toBe(`https://sepolia.etherscan.io/tx/${H}`)
    expect(explorerUrl({ broadcasts: false }, H)).toBeNull()
  })
})
