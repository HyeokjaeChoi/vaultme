import 'fake-indexeddb/auto'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBalances } from '../app/shared/api/useBalances'

const A = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
const B = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'

// The API at HTTP level (https://api.test, vitest.config.ts). JSON-RPC answers wait until the test sends them, so
// reads can finish out of order.
type Open = { body: string; answer: (hex: string) => void }
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
      const body = init.body as string
      const { id } = JSON.parse(body) as { id: number }
      return new Promise<Response>((resolve) => {
        open.push({ body, answer: (result) => resolve(json(200, { jsonrpc: '2.0', id, result })) })
      })
    }),
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
})
// The API client is a dynamic import on first read; its first transform takes over a second, longer than waitFor.
beforeAll(async () => {
  await Promise.all([import('../app/shared/api/client'), import('@vaultme/api-client')])
})

/** Answers the open eth_getBalance and balanceOf calls for `address` with `hex` (wei and USDC base units). */
async function answer(address: string, hex: string) {
  const key = address.slice(2).toLowerCase()
  const forAddress = (o: Open) => o.body.toLowerCase().includes(key)
  await waitFor(() => {
    expect(open.filter(forAddress)).toHaveLength(2)
  })
  for (const o of open.filter(forAddress)) o.answer(hex)
  open = open.filter((o) => !forAddress(o))
}

describe('useBalances', () => {
  it('shows the new address as soon as its read ends, while the one the user left is still open', async () => {
    const { result, rerender } = renderHook(({ a }) => useBalances(a), { initialProps: { a: A } })
    rerender({ a: B })
    await answer(B, '0xde0b6b3a7640000') // 1 ETH
    await waitFor(() => {
      expect(result.current[0]).toMatchObject({ status: 'ok', ETH: '1' })
    })
  })

  it('an older read of the same address does not replace a newer one (A -> B -> A)', async () => {
    const { result, rerender } = renderHook(({ a }) => useBalances(a), { initialProps: { a: A } })
    await waitFor(() => {
      expect(open).toHaveLength(2)
    })
    const first = open.splice(0) // the first read of A, answered last
    rerender({ a: B })
    rerender({ a: A })
    await answer(A, '0x1bc16d674ec80000') // 2 ETH, the newer read
    await waitFor(() => {
      expect(result.current[0]).toMatchObject({ status: 'ok', ETH: '2' })
    })
    for (const o of first) o.answer('0xde0b6b3a7640000') // 1 ETH, the older read
    await new Promise((r) => setTimeout(r, 50))
    expect(result.current[0]).toMatchObject({ status: 'ok', ETH: '2' })
  })
})
