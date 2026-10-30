import { describe, expect, it } from 'vitest'
import { measureApi, memorySigner } from '../src/latency.ts'

const ID = '11111111-1111-4111-8111-111111111111'
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** Answers like the API: register, token, rpc, history, health. `fail` makes one path answer 503. */
function fakeApi(fail?: string) {
  const calls: string[] = []
  const f: typeof fetch = (input, init) => {
    const path = new URL(input).pathname
    calls.push(`${init?.method ?? 'GET'} ${path}`)
    if (path === fail) return Promise.resolve(json({ code: 'unavailable', message: 'x', retryable: true }, 503))
    if (path === '/v1/health') return Promise.resolve(json({ ok: true, version: '1' }))
    if (path === '/v1/installs') return Promise.resolve(json({ installId: ID }, 201))
    if (path === '/v1/installs/token') return Promise.resolve(json({ token: 't', expiresAt: 4_102_444_800 }))
    if (path === '/v1/rpc') return Promise.resolve(json({ jsonrpc: '2.0', id: 1, result: '0x1' }))
    return Promise.resolve(json({ items: [], nextCursor: null, incomplete: false }))
  }
  return { f, calls }
}

const opts = (f: typeof fetch, n = { health: 3, rpc: 3, history: 2 }) => {
  let t = 0
  const sleeps: number[] = []
  return {
    sleeps,
    o: {
      baseUrl: 'https://api.test',
      appVersion: '0.1.0',
      n,
      address: '0x9858EfFD232B4033E47d90003D41EC34EcaEda94',
      historyGapMs: 31_000,
      fetch: f,
      sleep: (ms: number) => {
        sleeps.push(ms)
        return Promise.resolve()
      },
      now: () => (t += 10), // every timed call takes 10 ms
    },
  }
}

describe('measureApi', () => {
  it('registers once, times N calls per endpoint and spaces the history calls', async () => {
    const { f, calls } = fakeApi()
    const { o, sleeps } = opts(f)
    const r = await measureApi(o)
    expect(r.health).toEqual({ n: 3, ok: 3, p50Ms: 10, p95Ms: 10 })
    expect(r.rpc).toEqual({ n: 3, ok: 3, p50Ms: 10, p95Ms: 10 })
    expect(r.history).toEqual({ n: 2, ok: 2, p50Ms: 10, p95Ms: 10 })
    expect(sleeps).toEqual([31_000]) // between the 2 history calls only
    expect(calls.filter((c) => c === 'POST /v1/installs')).toHaveLength(1)
    expect(calls.filter((c) => c === 'POST /v1/installs/token')).toHaveLength(1)
    expect(calls.filter((c) => c === 'POST /v1/rpc')).toHaveLength(1 + 3) // 1 warm-up
    expect(calls.filter((c) => c === 'POST /v1/history')).toHaveLength(2)
  })

  it('counts a failed call in n but not in ok, and has no percentile without a success', async () => {
    const { f } = fakeApi('/v1/history')
    const { o } = opts(f)
    const r = await measureApi(o)
    expect(r.history).toEqual({ n: 2, ok: 0, p50Ms: null, p95Ms: null })
    const health = fakeApi('/v1/health')
    expect((await measureApi(opts(health.f).o)).health.ok).toBe(0)
  })
})

describe('memorySigner', () => {
  it('signs with the key it made (r||s, 64 bytes) and refuses before a key exists', async () => {
    const s = memorySigner()
    expect(await s.publicKey()).toBeNull()
    await expect(s.sign('x')).rejects.toThrow('no key')
    const pub = await s.createKey()
    expect(Buffer.from(pub, 'base64url')).toHaveLength(65)
    expect(Buffer.from(await s.sign('x'), 'base64url')).toHaveLength(64)
    await s.setInstallId(ID)
    expect(await s.getInstallId()).toBe(ID)
  })
})
