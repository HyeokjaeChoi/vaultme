import 'fake-indexeddb/auto'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { useHistory } from '../app/shared/api/useHistory'
import { queryClient } from '../app/shared/api/query'

const A = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
const B = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
const PEER = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'

// HistoryItem of the API contract (packages/contracts). Newest first, one tx per row.
const row = (n: number, o: Record<string, unknown> = {}) => ({
  id: `0x${n.toString(16).padStart(64, '0')}:0`,
  kind: 'native',
  hash: `0x${n.toString(16).padStart(64, '0')}`,
  blockNumber: 1000 + n,
  txIndex: 0,
  timestamp: 1_760_000_000 - n * 60,
  direction: 'in',
  asset: 'ETH',
  value: '50000000000000000', // 0.05 ETH
  from: PEER,
  to: A,
  status: 'ok',
  zeroValue: false,
  ...o,
})
const page = (items: unknown[], nextCursor: string | null = null) => ({ items, nextCursor, incomplete: false })

// The API at HTTP level (https://api.test, vitest.config.ts). A history request waits until the test answers it, so
// answers can come out of order.
type Open = { address: string; cursor?: string; answer: (body: unknown, status?: number) => void }
let open: Open[] = []
let last: Headers | null = null
beforeEach(() => {
  queryClient.clear() // one client for the app: a read of one test must not answer the next
  open = []
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init: RequestInit) => {
      const path = new URL(url).pathname
      if (path === '/v1/installs') return Promise.resolve(json(201, { installId: crypto.randomUUID() }))
      if (path === '/v1/installs/token')
        return Promise.resolve(json(200, { token: 'tok', expiresAt: Math.floor(Date.now() / 1000) + 900 }))
      last = new Headers(init.headers)
      const { address, cursor } = JSON.parse(init.body as string) as { address: string; cursor?: string }
      return new Promise<Response>((resolve) => {
        open.push({ address, ...(cursor ? { cursor } : {}), answer: (b, s = 200) => resolve(json(s, b)) })
      })
    }),
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
})
// The API client and the history module are dynamic imports on first read; their first transform takes over a second.
beforeAll(async () => {
  await Promise.all([import('../app/shared/api/client'), import('@vaultme/api-client'), import('@vaultme/history')])
})

const pending = (address: string, cursor?: string) =>
  waitFor(() => {
    const o = open.find((x) => x.address.toLowerCase() === address.toLowerCase() && x.cursor === cursor)
    expect(o).toBeDefined()
    return o!
  })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const take = (o: Open) => void (open = open.filter((x) => x !== o))

describe('useHistory', () => {
  it('the rows keep their array identity while the pages are the same (the section restarts its clock on a new one)', async () => {
    const { result, rerender } = renderHook(() => useHistory(A))
    ;(await pending(A)).answer(page([row(1)]))
    await waitFor(() => {
      expect(result.current[0]).toMatchObject({ status: 'ok' })
    })
    const before = result.current[0]
    rerender()
    expect(before.status === 'ok' && result.current[0].status === 'ok' && result.current[0].items).toBe(
      before.status === 'ok' && before.items,
    )
  })

  it('first page: loading, then the rows through the shared module (poisoning filter included); the request is a web request', async () => {
    const { result } = renderHook(() => useHistory(A))
    expect(result.current[0]).toEqual({ status: 'loading' })
    const o = await pending(A)
    expect(last?.get('x-client')).toBe('web')
    o.answer(
      page([row(1), row(2, { zeroValue: true, value: '0' }), row(3, { direction: 'out', to: PEER, from: A })], 'c1'),
    )
    await waitFor(() => {
      expect(result.current[0]).toMatchObject({ status: 'ok', nextCursor: 'c1', more: 'idle' })
    })
    const s = result.current[0]
    expect(s.status === 'ok' && s.items.map((i) => [i.kind, i.amount, i.status])).toEqual([
      ['receive', '0.05', 'confirmed'],
      ['send', '0.05', 'confirmed'],
    ])
  })

  it('an API error is failed (no cache on the web); retry asks again and shows loading until it answers', async () => {
    const { result } = renderHook(() => useHistory(A))
    ;(await pending(A)).answer({ code: 'unavailable', message: 'x', retryable: true }, 503)
    await waitFor(() => {
      expect(result.current[0]).toEqual({ status: 'failed' })
    })
    take(open[0]!)
    act(() => result.current[1].retry())
    await waitFor(() => {
      expect(result.current[0]).toEqual({ status: 'loading' })
    })
    ;(await pending(A)).answer(page([]))
    await waitFor(() => {
      expect(result.current[0]).toMatchObject({ status: 'ok', items: [] })
    })
  })

  it('an answer belongs to its own address (A -> B -> A), and a retry replaces the read it answers for', async () => {
    const { result, rerender } = renderHook(({ a }) => useHistory(a), {
      initialProps: { a: A },
    })
    const first = await pending(A)
    take(first)
    rerender({ a: B })
    const second = await pending(B)
    take(second)
    rerender({ a: A }) // the read of A is still open: the same query, not a second request
    second.answer(page([row(8)])) // the address the user left
    await sleep(50)
    expect(result.current[0]).toEqual({ status: 'loading' })
    first.answer(page([row(1), row(2)]))
    await waitFor(() => {
      expect(result.current[0]).toMatchObject({ status: 'ok' })
    })
    const s = result.current[0]
    expect(s.status === 'ok' && s.items).toHaveLength(2)
  })

  it('retry while a read is open: only the new read answers', async () => {
    const { result } = renderHook(() => useHistory(A))
    const old = await pending(A)
    take(old)
    act(() => result.current[1].retry())
    ;(await pending(A)).answer(page([row(1)]))
    await waitFor(() => {
      expect(result.current[0]).toMatchObject({ status: 'ok' })
    })
    old.answer(page([row(9), row(8)]))
    await sleep(50)
    const s = result.current[0]
    expect(s.status === 'ok' && s.items).toHaveLength(1)
  })

  it('loading is per request: the next address shows loading while a read the user left is still open', async () => {
    const { result, rerender } = renderHook(({ a }) => useHistory(a), {
      initialProps: { a: A },
    })
    take(await pending(A)) // never answered
    rerender({ a: B })
    expect(result.current[0]).toEqual({ status: 'loading' })
    ;(await pending(B)).answer(page([row(1)]))
    await waitFor(() => {
      expect(result.current[0]).toMatchObject({ status: 'ok' })
    })
  })

  it('more: loading on that request only, appends the older rows without a row it has, and ends at no cursor', async () => {
    const { result } = renderHook(() => useHistory(A))
    ;(await pending(A)).answer(page([row(1), row(2)], 'c1'))
    await waitFor(() => {
      expect(result.current[0]).toMatchObject({ status: 'ok' })
    })
    take(open[0]!)
    act(() => result.current[1].more())
    await waitFor(() => {
      expect(result.current[0]).toMatchObject({ status: 'ok', more: 'loading' })
    })
    act(() => result.current[1].more()) // a second click while loading asks for nothing
    const o = await pending(A, 'c1')
    expect(open.filter((x) => x.cursor === 'c1')).toHaveLength(1)
    o.answer(page([row(2), row(3)], null))
    await waitFor(() => {
      expect(result.current[0]).toMatchObject({ status: 'ok', more: 'idle', nextCursor: null })
    })
    const s = result.current[0]
    expect(s.status === 'ok' && s.items.map((i) => i.id)).toEqual([row(1).id, row(2).id, row(3).id])
  })

  it('more failed: the rows stay, the state says failed, and a second try works', async () => {
    const { result } = renderHook(() => useHistory(A))
    ;(await pending(A)).answer(page([row(1)], 'c1'))
    await waitFor(() => {
      expect(result.current[0]).toMatchObject({ status: 'ok' })
    })
    act(() => result.current[1].more())
    ;(await pending(A, 'c1')).answer({ code: 'unavailable', message: 'x', retryable: true }, 503)
    await waitFor(() => {
      expect(result.current[0]).toMatchObject({ status: 'ok', more: 'failed', nextCursor: 'c1' })
    })
    take(open.find((x) => x.cursor === 'c1')!)
    act(() => result.current[1].more())
    ;(await pending(A, 'c1')).answer(page([row(2)]))
    await waitFor(() => {
      expect(result.current[0]).toMatchObject({ status: 'ok', more: 'idle', nextCursor: null })
    })
  })

  it('a more answer that comes after the user left the address is dropped', async () => {
    const { result, rerender } = renderHook(({ a }) => useHistory(a), {
      initialProps: { a: A },
    })
    ;(await pending(A)).answer(page([row(1)], 'c1'))
    await waitFor(() => {
      expect(result.current[0]).toMatchObject({ status: 'ok' })
    })
    act(() => result.current[1].more())
    const slow = await pending(A, 'c1')
    take(slow)
    rerender({ a: B })
    ;(await pending(B)).answer(page([row(5)]))
    await waitFor(() => {
      expect(result.current[0]).toMatchObject({ status: 'ok' })
    })
    slow.answer(page([row(9)]))
    await new Promise((r) => setTimeout(r, 50))
    const s = result.current[0]
    expect(s.status === 'ok' && s.items.map((i) => i.id)).toEqual([row(5).id])
  })

  it('no address: loading, no request', () => {
    const { result } = renderHook(() => useHistory(null))
    expect(result.current[0]).toEqual({ status: 'loading' })
    expect(open).toEqual([])
  })
})
