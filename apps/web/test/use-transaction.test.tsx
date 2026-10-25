import 'fake-indexeddb/auto'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTransaction } from '../app/shared/api/useTransaction'

const H1 = `0x${'11'.repeat(32)}`
const H2 = `0x${'22'.repeat(32)}`
const A = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
const B = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'

const tx = (hash: string) => ({ hash, from: A, to: B, value: '0xb1a2bc2ec50000', input: '0x', blockNumber: '0x713a27' })
const receipt = (transactionHash: unknown) => ({
  status: '0x1',
  gasUsed: '0x5208',
  effectiveGasPrice: '0x3b9aca00',
  blockNumber: '0x713a27',
  transactionHash,
})
const block = { number: '0x713a27', timestamp: '0x68fc4f00' }

// The API at HTTP level (https://api.test). Each eth_getTransactionByHash waits until the test answers it, so answers can come out of order.
type Open = { hash: string; answer: (result: unknown, status?: number) => void }
let open: Open[] = []
beforeEach(() => {
  open = []
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init: RequestInit) => {
      const path = new URL(url).pathname
      if (path === '/v1/installs') return Promise.resolve(json(201, { installId: crypto.randomUUID() }))
      if (path === '/v1/installs/token')
        return Promise.resolve(json(200, { token: 'tok', expiresAt: Math.floor(Date.now() / 1000) + 900 }))
      const { id, method, params } = JSON.parse(init.body as string) as {
        id: number
        method: string
        params: unknown[]
      }
      const ok = (result: unknown) => json(200, { jsonrpc: '2.0', id, result })
      if (method === 'eth_getTransactionReceipt') return Promise.resolve(ok(receipt(params[0])))
      if (method === 'eth_getBlockByNumber') return Promise.resolve(ok(block))
      return new Promise<Response>((resolve) => {
        open.push({
          hash: params[0] as string,
          answer: (r, s = 200) =>
            resolve(s === 200 ? ok(r) : json(s, { code: 'unavailable', message: 'x', retryable: true })),
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
const take = (o: Open) => void (open = open.filter((x) => x !== o))

describe('useTransaction', () => {
  it('no hash: loading, and no request', () => {
    const { result } = renderHook(() => useTransaction(null))
    expect(result.current[0]).toEqual({ status: 'loading' })
    expect(open).toEqual([])
  })

  it('loading, then the transaction through the shared module', async () => {
    const { result } = renderHook(() => useTransaction(H1))
    expect(result.current[0]).toEqual({ status: 'loading' })
    ;(await pending(H1)).answer(tx(H1))
    await waitFor(() => {
      expect(result.current[0]).toMatchObject({
        status: 'ok',
        tx: { hash: H1, asset: 'ETH', amount: 50_000_000_000_000_000n },
      })
    })
  })

  it('an unknown hash is notfound; an API error is failed, and retry shows loading until it answers', async () => {
    const { result } = renderHook(() => useTransaction(H1))
    ;(await pending(H1)).answer(null)
    await waitFor(() => {
      expect(result.current[0]).toEqual({ status: 'notfound' })
    })
    take(open[0]!)
    act(() => result.current[1]())
    expect(result.current[0]).toEqual({ status: 'loading' })
    ;(await pending(H1)).answer(null, 503)
    await waitFor(() => {
      expect(result.current[0]).toEqual({ status: 'failed' })
    })
  })

  it('a hash the user left does not replace the new one, and an older retry of the same hash does not either (H1 -> H2 -> H1)', async () => {
    const { result, rerender } = renderHook(({ h }) => useTransaction(h), { initialProps: { h: H1 } })
    const first = await pending(H1)
    take(first)
    rerender({ h: H2 })
    const second = await pending(H2)
    take(second)
    rerender({ h: H1 })
    ;(await pending(H1)).answer(tx(H1))
    await waitFor(() => {
      expect(result.current[0]).toMatchObject({ status: 'ok', tx: { hash: H1 } })
    })
    first.answer(null) // the old read of H1 answers last
    second.answer(tx(H2))
    await act(() => Promise.resolve())
    expect(result.current[0]).toMatchObject({ status: 'ok', tx: { hash: H1 } })
  })

  it('shows loading, not the old transaction, for a new hash', async () => {
    const { result, rerender } = renderHook(({ h }) => useTransaction(h), { initialProps: { h: H1 } })
    ;(await pending(H1)).answer(tx(H1))
    await waitFor(() => {
      expect(result.current[0].status).toBe('ok')
    })
    rerender({ h: H2 })
    expect(result.current[0]).toEqual({ status: 'loading' })
  })
})
