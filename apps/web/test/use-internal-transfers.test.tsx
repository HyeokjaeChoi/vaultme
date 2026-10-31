import 'fake-indexeddb/auto'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { INTERNAL_DEADLINE_MS, useInternalTransfers } from '../app/shared/api/useInternalTransfers'
import { queryClient } from '../app/shared/api/query'

const H1 = `0x${'11'.repeat(32)}`
const H2 = `0x${'22'.repeat(32)}`
const item = {
  from: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
  to: '0x9858effd232b4033e47d90003d41ec34ecaeda94',
  value: '50000000000000000',
  ok: true,
}

// The API at HTTP level. Each /v1/tx/internal waits until the test answers it, so answers can come out of order.
type Open = { hash: string; answer: (body: unknown, status?: number) => void }
let open: Open[] = []
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
      const { hash } = JSON.parse(init.body as string) as { hash: string }
      return new Promise<Response>((resolve) => {
        open.push({
          hash,
          answer: (b, s = 200) =>
            resolve(json(s, s === 200 ? b : { code: 'unavailable', message: 'x', retryable: true })),
        })
      })
    }),
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
})
beforeAll(async () => {
  await Promise.all([import('../app/shared/api/client'), import('@vaultme/api-client')])
})

const pending = (hash: string) =>
  waitFor(() => {
    const o = open.find((x) => x.hash === hash)
    expect(o).toBeDefined()
    return o!
  })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const take = (o: Open) => void (open = open.filter((x) => x !== o))

describe('useInternalTransfers', () => {
  it('no hash: loading, and no request', () => {
    const { result } = renderHook(() => useInternalTransfers(null))
    expect(result.current[0]).toEqual({ status: 'loading' })
    expect(open).toEqual([])
  })

  it('loading, then the items with wei as bigint', async () => {
    const { result } = renderHook(() => useInternalTransfers(H1))
    expect(result.current[0]).toEqual({ status: 'loading' })
    ;(await pending(H1)).answer({ items: [item] })
    await waitFor(() => {
      expect(result.current[0]).toEqual({ status: 'ok', items: [{ ...item, value: 50_000_000_000_000_000n }] })
    })
  })

  it('an API error is failed, and retry shows loading until it answers', async () => {
    const { result } = renderHook(() => useInternalTransfers(H1))
    ;(await pending(H1)).answer(null, 503)
    await waitFor(() => {
      expect(result.current[0]).toEqual({ status: 'failed' })
    })
    take(open[0]!)
    act(() => result.current[1]())
    await waitFor(() => {
      expect(result.current[0]).toEqual({ status: 'loading' })
    })
    ;(await pending(H1)).answer({ items: [] })
    await waitFor(() => {
      expect(result.current[0]).toEqual({ status: 'ok', items: [] })
    })
  })

  it('an answer that does not fit the contract is failed', async () => {
    const { result } = renderHook(() => useInternalTransfers(H1))
    ;(await pending(H1)).answer({ items: [{ ...item, value: 'x' }] })
    await waitFor(() => {
      expect(result.current[0]).toEqual({ status: 'failed' })
    })
  })

  it('a read that never answers is failed after the deadline, so the page is never held', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      const { result } = renderHook(() => useInternalTransfers(H1))
      await act(() => vi.advanceTimersByTimeAsync(INTERNAL_DEADLINE_MS - 1))
      expect(result.current[0]).toEqual({ status: 'loading' })
      await act(() => vi.advanceTimersByTimeAsync(1))
      await act(() => vi.advanceTimersByTimeAsync(1)) // the query notifies on the next tick
      expect(result.current[0]).toEqual({ status: 'failed' })
    } finally {
      vi.useRealTimers()
    }
  })

  it('an answer belongs to its own hash (H1 -> H2 -> H1), and a new hash shows loading', async () => {
    const { result, rerender } = renderHook(({ h }) => useInternalTransfers(h), {
      initialProps: { h: H1 },
    })
    const first = await pending(H1)
    take(first)
    rerender({ h: H2 })
    expect(result.current[0]).toEqual({ status: 'loading' })
    const second = await pending(H2)
    take(second)
    rerender({ h: H1 }) // the read of H1 is still open: the same query, not a second request
    second.answer({ items: [] })
    await sleep(50)
    expect(result.current[0]).toEqual({ status: 'loading' })
    first.answer({ items: [item] })
    await waitFor(() => {
      expect(result.current[0]).toMatchObject({ status: 'ok', items: [{ value: 50_000_000_000_000_000n }] })
    })
  })
})
