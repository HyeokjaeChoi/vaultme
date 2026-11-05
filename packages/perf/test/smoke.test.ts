import { describe, expect, it } from 'vitest'
import { smokeApi } from '../src/smoke.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

function fakeApi(over: { history?: unknown; rpcResult?: unknown; historyStatus?: number; throttled?: number } = {}) {
  let throttled = over.throttled ?? 0
  const f: typeof fetch = (input) => {
    const path = new URL(input).pathname
    if (path === '/v1/history' && throttled-- > 0)
      return Promise.resolve(json({ code: 'unavailable', message: 'x', retryable: true }, 503))
    if (path === '/v1/installs')
      return Promise.resolve(json({ installId: '11111111-1111-4111-8111-111111111111' }, 201))
    if (path === '/v1/installs/token') return Promise.resolve(json({ token: 't', expiresAt: 4_102_444_800 }))
    if (path === '/v1/rpc') return Promise.resolve(json({ jsonrpc: '2.0', id: 1, result: over.rpcResult ?? '0x1' }))
    return Promise.resolve(
      json(over.history ?? { items: [], nextCursor: null, incomplete: false }, over.historyStatus ?? 200),
    )
  }
  return { baseUrl: 'https://api.test', appVersion: '0.1.0', fetch: f, sleep: () => Promise.resolve() }
}

describe('smokeApi', () => {
  it('passes on a balance and a history page of the right shape', async () => {
    await expect(smokeApi(fakeApi())).resolves.toBeUndefined()
  })
  it('retries a retryable 503 and gives up after 3 tries', async () => {
    await expect(smokeApi(fakeApi({ throttled: 2 }))).resolves.toBeUndefined()
    await expect(smokeApi(fakeApi({ throttled: 3 }))).rejects.toThrow()
  })
  it('fails on a bad balance, a bad history shape and a non-2xx answer', async () => {
    await expect(smokeApi(fakeApi({ rpcResult: 'nope' }))).rejects.toThrow()
    await expect(smokeApi(fakeApi({ history: { items: [{}], nextCursor: null, incomplete: false } }))).rejects.toThrow()
    await expect(
      smokeApi(fakeApi({ history: { code: 'unavailable', message: 'x', retryable: true }, historyStatus: 503 })),
    ).rejects.toThrow()
  })
})
