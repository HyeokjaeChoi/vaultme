import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { persistOptions } from '../src/shared/query/persist'

// ADR-0021 PR 3: the history, send-snapshot and review reads as query options. The chain, kv and history module are stubs.
const m = vi.hoisted(() => ({
  getSnapshot: vi.fn(),
  view: vi.fn(),
  findRow: vi.fn(),
  pending: null as object | string | null,
  zero: false,
}))
vi.mock('@/shared/chain', () => ({ chain: { broadcasts: true, getSnapshot: m.getSnapshot } }))
vi.mock('@/shared/storage', () => ({ getAccountAddress: () => null }))
vi.mock('@/entities/account', () => ({ account: { address: '0x' + '1'.repeat(40) } }))
vi.mock('@/entities/transaction', () => ({ readPendingTx: () => m.pending }))
vi.mock('../src/features/history/model/loader', () => ({
  history: { view: m.view, findRow: m.findRow },
  accountAddress: () => ME,
  showZero: () => m.zero,
}))

import { historyKey, historyQuery, rowLookupQuery } from '../src/features/history/model/historyQuery'
import { reviewQuery } from '../src/features/send/model/useReviewCore'
import { sendableQuery } from '../src/features/send/model/useSendable'

const ME = '0x' + 'a'.repeat(40)
const TO = ('0x' + 'b'.repeat(40)) as `0x${string}`
const FROM = ('0x' + '1'.repeat(40)) as `0x${string}`
const snap = {
  nativeBalance: 5n * 10n ** 18n,
  tokenBalance: 7_000_000n,
  gasLimit: 21_000n,
  baseFeePerGas: 10n ** 9n,
  maxPriorityFeePerGas: 10n ** 9n,
  nonce: 3,
}
const qc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

beforeEach(() => {
  m.getSnapshot.mockReset()
  m.view.mockReset()
  m.findRow.mockReset()
  m.pending = null
  m.zero = false
})

describe('history reads', () => {
  it('the list view reads the local send when the fetch runs, and a corrupt record counts as none', async () => {
    m.view.mockResolvedValue({ items: [], updatedAt: 1, failed: false, nextCursor: null })
    const c = qc()
    m.pending = { hash: '0x1' }
    await c.query(historyQuery(ME))
    expect(m.view).toHaveBeenLastCalledWith(ME, { hash: '0x1' })
    m.pending = 'corrupt'
    await c.query(historyQuery(ME))
    expect(m.view).toHaveBeenLastCalledWith(ME, null)
  })
  it('a failed read is data (the failed view with the seam cache), as before', async () => {
    const failed = { items: [{ id: 'a' }], updatedAt: 1, failed: true, nextCursor: null }
    m.view.mockResolvedValue(failed)
    expect(await qc().query(historyQuery(ME))).toBe(failed)
  })
  it('each account has its own list view; a row lookup is keyed by account and id', () => {
    expect(historyQuery(ME).queryKey).toEqual(['history', ME, false])
    expect(historyKey(null)).toEqual(['history', null, false])
    expect(rowLookupQuery('0xh:0').queryKey).toEqual(['historyRow', ME, '0xh:0', false])
    m.zero = true
    expect(historyKey(ME)).toEqual(['history', ME, true]) // a flip of S63 is a new view
    m.zero = false
  })
  it('a send that settled while the page was fetched is merged again (the list never keeps "보내는 중")', async () => {
    m.pending = { hash: '0x1', state: 'Pending' }
    m.view.mockImplementationOnce((_a: unknown, local: unknown) => {
      m.pending = { hash: '0x1', state: 'Confirmed' } // a check wrote the new state during the fetch
      return Promise.resolve({ local, failed: false })
    })
    m.view.mockImplementationOnce((_a: unknown, local: unknown) => Promise.resolve({ local, failed: false }))
    const v = (await qc().query(historyQuery(ME))) as unknown as { local: { state: string } }
    expect(m.view).toHaveBeenCalledTimes(2)
    expect(v.local.state).toBe('Confirmed')
  })
  it('a send that did not change is merged once', async () => {
    m.pending = { hash: '0x1', state: 'Pending' }
    m.view.mockResolvedValue({ items: [], updatedAt: 1, failed: false, nextCursor: null })
    await qc().query(historyQuery(ME))
    expect(m.view).toHaveBeenCalledTimes(1)
  })
  it('a row lookup is read on mount and retry only (no app-return refetch)', () => {
    const q = rowLookupQuery('0xh')
    expect(q.refetchOnWindowFocus).toBe(false)
    expect(q.refetchOnReconnect).toBe(false)
  })
  it('a row lookup goes through findRow (seam cache first, else a fresh page)', async () => {
    m.findRow.mockResolvedValue({ status: 'none' })
    expect(await qc().query(rowLookupQuery('0xh'))).toEqual({ status: 'none' })
    expect(m.findRow).toHaveBeenCalledWith(ME, '0xh')
  })
})

describe('send snapshot (amount step)', () => {
  it('maps the snapshot to balance, ETH balance and fee cap; USDC uses its token balance', async () => {
    m.getSnapshot.mockResolvedValue(snap)
    const eth = await qc().query(sendableQuery(FROM, TO, 'ETH'))
    expect(eth.balance).toBe(snap.nativeBalance)
    const usdc = await qc().query(sendableQuery(FROM, TO, 'USDC'))
    expect(usdc.balance).toBe(7_000_000n)
    expect(usdc.nativeBalance).toBe(snap.nativeBalance)
    expect(m.getSnapshot).toHaveBeenCalledWith(FROM, 'ETH', TO, '0.000001')
  })
  it('a new recipient or asset is a new query (old numbers never show for it)', () => {
    const a = sendableQuery(FROM, TO, 'ETH').queryKey
    expect(sendableQuery(FROM, TO, 'USDC').queryKey).not.toEqual(a)
    expect(sendableQuery(FROM, ('0x' + 'c'.repeat(40)) as `0x${string}`, 'ETH').queryKey).not.toEqual(a)
  })
})

describe('send review read', () => {
  it('a chain failure is data: no review, error "chain" with its cause', async () => {
    const boom = new Error('offline')
    m.getSnapshot.mockRejectedValue(boom)
    expect(await qc().query(reviewQuery(FROM, TO, '0.1', 'ETH', []))).toMatchObject({
      review: null,
      error: 'chain',
      cause: boom,
    })
  })
  it('a failed re-read replaces the old review on screen (a signed tx must match the reviewed one)', async () => {
    const c = qc()
    m.getSnapshot.mockResolvedValue(snap)
    const o = new QueryObserver(c, reviewQuery(FROM, TO, '0.1', 'ETH', [])) // the screen holds the query, as useQuery does
    const stop = o.subscribe(() => undefined)
    expect((await o.refetch()).data?.review).not.toBeNull()
    m.getSnapshot.mockRejectedValue(new Error('offline'))
    expect((await o.refetch()).data).toMatchObject({ review: null, error: 'chain' })
    stop()
  })
  it('two refreshes that overlap share one read, and both get its answer (no old review as result)', async () => {
    const c = qc()
    m.getSnapshot.mockResolvedValue(snap) // the mount read
    const o = new QueryObserver(c, reviewQuery(FROM, TO, '0.1', 'ETH', []))
    const stop = o.subscribe(() => undefined)
    await o.refetch()
    let release: () => void = () => undefined
    m.getSnapshot.mockClear()
    m.getSnapshot.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ ...snap, nativeBalance: 1n })
        }),
    )
    const a = o.refetch({ cancelRefetch: false }) // what useReviewCore.refresh does
    const b = o.refetch({ cancelRefetch: false })
    release()
    const [ra, rb] = await Promise.all([a, b])
    expect(m.getSnapshot).toHaveBeenCalledTimes(1)
    expect(ra.data?.review).toBeNull() // the new read answered (amount over the balance), not the old review
    expect(rb.data?.review).toBeNull()
    stop()
  })
  it('a prepare error (amount over the balance) shows as the error, with no review', async () => {
    m.getSnapshot.mockResolvedValue({ ...snap, nativeBalance: 1n })
    const r = await qc().query(reviewQuery(FROM, TO, '0.1', 'ETH', []))
    expect(r.review).toBeNull()
    expect(r.error).not.toBeNull()
    expect(r.error).not.toBe('chain')
  })
  it('the key holds recipients by value and every input that changes the review', () => {
    const k = (amount: string, prev: string[]) => reviewQuery(FROM, TO, amount, 'ETH', prev).queryKey
    expect(k('0.1', ['x', 'y'])).toEqual(k('0.1', ['x', 'y']))
    expect(k('0.1', [])).not.toEqual(k('0.2', []))
    expect(k('0.1', [])).not.toEqual(k('0.1', ['x']))
  })
})

describe('what is persisted (ADR-0021 PR 3)', () => {
  it('none of the history, snapshot, review or receipt queries are written to storage', async () => {
    const c = qc()
    m.view.mockResolvedValue({ items: [], updatedAt: 1, failed: false, nextCursor: null })
    m.findRow.mockResolvedValue({ status: 'none' })
    m.getSnapshot.mockResolvedValue(snap)
    await Promise.all([
      c.query(historyQuery(ME)),
      c.query(rowLookupQuery('0xh')),
      c.query({ ...sendableQuery(FROM, TO, 'ETH'), gcTime: Infinity }),
      c.query({ ...reviewQuery(FROM, TO, '0.1', 'ETH', []), gcTime: Infinity }),
    ])
    const { shouldDehydrateQuery } = persistOptions({
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    }).dehydrateOptions!
    const queries = c.getQueryCache().getAll()
    expect(queries.length).toBeGreaterThan(0)
    expect(queries.filter((q) => shouldDehydrateQuery?.(q))).toEqual([])
  })
})
