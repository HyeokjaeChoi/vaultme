import { env } from 'cloudflare:workers'
import { USDC_SEPOLIA } from '@vaultme/contracts'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { app } from '../src/app.ts'
import { proxyRpc } from '../src/rpc.ts'
import { b64uEncode, issueToken } from '../src/auth.ts'

const open: RateLimit = { limit: () => Promise.resolve({ success: true }) }
const rand = () => b64uEncode(crypto.getRandomValues(new Uint8Array(24)))
// Fresh secrets per run. Upstream keys are unique so a leak is easy to grep for.
const E = {
  ...env,
  TOKEN_SECRET: rand() + rand(),
  INFURA_KEY: rand(),
  ALCHEMY_KEY: rand(),
  INSTALL_IP_LIMITER: open,
  INSTALL_LIMITER: open,
  RPC_IP_LIMITER: open,
}
const bearer = async () => ({
  Authorization: `Bearer ${(await issueToken({ env: E } as never, crypto.randomUUID())).token}`,
})

const rpc = async (body: unknown, e: typeof E = E, auth = true) =>
  app.request(
    '/v1/rpc',
    {
      method: 'POST',
      headers: { 'X-App-Version': '1.0.0', 'content-type': 'application/json', ...(auth ? await bearer() : {}) },
      body: JSON.stringify(body),
    },
    e,
  )
const req = (method: string, params: unknown[] = []) => ({ jsonrpc: '2.0', id: 7, method, params })
const ok = (result: unknown = '0x1') => new Response(JSON.stringify({ jsonrpc: '2.0', id: 7, result }))
const balanceOf = `0x70a08231${'0'.repeat(24)}${'ab'.repeat(20)}`
const call = (o: Record<string, unknown>) => req('eth_call', [{ to: USDC_SEPOLIA, data: balanceOf, ...o }, 'latest'])

const mock = (...impl: (() => Response | Promise<Response>)[]) => {
  const f = vi.fn()
  impl.forEach((i) => f.mockImplementationOnce(async () => i()))
  vi.stubGlobal('fetch', f)
  return f
}
/** Every console line of the test, so a case can prove that no upstream key reached the logs. */
const logs = () => {
  const out: string[] = []
  for (const m of ['log', 'warn', 'error'] as const)
    vi.spyOn(console, m).mockImplementation((...a) => void out.push(a.join(' ')))
  return out
}
const events = (out: string[]) => out.map((l) => JSON.parse(l) as Record<string, unknown>)
const noKeys = (text: string) => {
  expect(text).not.toContain(E.INFURA_KEY)
  expect(text).not.toContain(E.ALCHEMY_KEY)
}
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('POST /v1/rpc', () => {
  it('passes an allowed method through and keeps the id', async () => {
    const f = mock(() => ok('0xaa36a7'))
    const r = await rpc(req('eth_chainId'))
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ jsonrpc: '2.0', id: 7, result: '0xaa36a7' })
    expect(f).toHaveBeenCalledTimes(1)
    expect(String(f.mock.calls[0]![0])).toContain('infura')
  })

  it('rejects without a token', async () => {
    const f = mock(() => ok())
    expect((await rpc(req('eth_chainId'), E, false)).status).toBe(401)
    expect(f).not.toHaveBeenCalled()
  })

  it('rejects a method outside the list', async () => {
    const f = mock(() => ok())
    const r = await rpc(req('eth_getLogs'))
    expect(r.status).toBe(403)
    expect((await r.json<{ code: string }>()).code).toBe('method_not_allowed')
    expect(f).not.toHaveBeenCalled()
  })

  it('rejects a batch', async () => {
    const f = mock(() => ok())
    const r = await rpc([req('eth_chainId'), req('eth_blockNumber')])
    expect(r.status).toBe(400)
    expect(f).not.toHaveBeenCalled()
  })

  it('allows eth_call balanceOf on USDC, in any address case', async () => {
    mock(() => ok())
    expect((await rpc(call({ to: USDC_SEPOLIA.toLowerCase() }))).status).toBe(200)
  })

  it.each([
    ['other contract', call({ to: `0x${'11'.repeat(20)}` })],
    ['other selector', call({ data: `0xa9059cbb${'0'.repeat(64)}` })],
    ['missing arg', call({ data: '0x70a08231' })],
    ['extra arg', call({ data: `${balanceOf}00` })],
    ['input alias', call({ input: balanceOf })],
    ['state override', { ...call({}), params: [...call({}).params, {}] }],
  ])('rejects eth_call: %s', async (_n, body) => {
    const f = mock(() => ok())
    expect((await rpc(body)).status).toBe(403)
    expect(f).not.toHaveBeenCalled()
  })

  it('rejects eth_getBlockByNumber with full transactions', async () => {
    mock(() => ok())
    expect((await rpc(req('eth_getBlockByNumber', ['latest', true]))).status).toBe(403)
    expect((await rpc(req('eth_getBlockByNumber', ['latest', false]))).status).toBe(200)
  })

  it('allows eth_getTransactionByHash only with one 32-byte hash', async () => {
    mock(() => ok(null))
    const h = `0x${'ab'.repeat(32)}`
    expect((await rpc(req('eth_getTransactionByHash', [h]))).status).toBe(200)
    for (const params of [[], ['0x12'], [`${h}00`], [h, h], [1]]) {
      const f = mock(() => ok())
      expect((await rpc(req('eth_getTransactionByHash', params))).status).toBe(403)
      expect(f).not.toHaveBeenCalled()
    }
  })

  it.each([
    ['5xx', () => new Response('boom', { status: 502 })],
    ['429', () => new Response('slow down', { status: 429 })],
    ['timeout', () => Promise.reject(new DOMException('timed out', 'TimeoutError'))],
    ['HTML body', () => new Response('<html>oops</html>')],
    ['non-RPC JSON', () => new Response('[]')],
    ['network error', () => Promise.reject(new TypeError('fetch failed'))],
  ])('falls back to alchemy on primary %s', async (_n, bad) => {
    const f = mock(bad, () => ok('0x2'))
    const r = await rpc(req('eth_blockNumber'))
    expect(await r.json()).toEqual({ jsonrpc: '2.0', id: 7, result: '0x2' })
    expect(String(f.mock.calls[1]![0])).toContain('alchemy')
  })

  it('returns a retryable error when both upstreams are down', async () => {
    mock(
      () => new Response('x', { status: 500 }),
      () => Promise.reject(new TypeError('fetch failed')),
    )
    const r = await rpc(req('eth_blockNumber'))
    expect(r.status).toBe(503)
    expect(await r.json()).toMatchObject({ code: 'unavailable', retryable: true })
  })

  it('does not retry a JSON-RPC error', async () => {
    const err = { jsonrpc: '2.0', id: 7, error: { code: -32000, message: 'nonce too low' } }
    const f = mock(() => new Response(JSON.stringify(err)))
    const r = await rpc(req('eth_sendRawTransaction', ['0x02']))
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual(err)
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('never leaks an upstream key', async () => {
    const leaky = (k: string) => () =>
      new Response(JSON.stringify({ jsonrpc: '2.0', id: 7, error: { code: 1, message: `bad https://x/v3/${k}` } }))
    mock(leaky(E.INFURA_KEY), leaky(E.ALCHEMY_KEY))
    const r = await rpc(req('eth_blockNumber'))
    const text = await r.text()
    expect(r.status).toBe(503)
    expect(text).not.toContain(E.INFURA_KEY)
    expect(text).not.toContain(E.ALCHEMY_KEY)
  })

  it('fails closed (500) when a key is missing', async () => {
    mock(() => ok())
    const r = await rpc(req('eth_chainId'), { ...E, INFURA_KEY: '' })
    expect(r.status).toBe(500)
  })

  it('rate limits by IP', async () => {
    const r = await rpc(req('eth_chainId'), {
      ...E,
      RPC_IP_LIMITER: { limit: () => Promise.resolve({ success: false }) },
    })
    expect(r.status).toBe(429)
  })
})

// API-1: a spent quota is a failure of that upstream, not an answer. Infura answers a spent daily cap with HTTP 402 and a JSON-RPC error body
// (`code` 402, `event` -33000) and a spent throughput with `code` 429 / `event` -33200 (docs.infura.io/how-to/avoid-rate-limiting, read 2026-11-15).
// The docs give no HTTP status for the second one, and -32005 is the EIP-1474 "limit exceeded" code, so a quota error may arrive inside a 200.
describe('quota errors', () => {
  const limited = (code: number, extra: Record<string, unknown> = {}) =>
    JSON.stringify({ jsonrpc: '2.0', id: 7, error: { code, message: 'limit', ...extra } })
  const infuraCap = limited(402, { event: -33000, details: 'You have reached your daily credit limit.' })
  const infuraThroughput = limited(429, { event: -33200, details: 'You have surpassed your allowed throughput limit.' })

  it('Infura HTTP 402 (daily cap): alchemy answers', async () => {
    const out = logs()
    const f = mock(
      () => new Response(infuraCap, { status: 402 }),
      () => ok('0x2'),
    )
    const r = await rpc(req('eth_blockNumber'))
    expect(await r.json()).toEqual({ jsonrpc: '2.0', id: 7, result: '0x2' })
    expect(String(f.mock.calls[1]![0])).toContain('alchemy')
    noKeys(out.join('\n'))
  })

  it.each([
    ['the documented daily cap body', infuraCap, 402],
    ['the documented throughput body', infuraThroughput, 429],
    ['-32005', limited(-32005), -32005],
    ['402', limited(402), 402],
    ['429', limited(429), 429],
    ['event -33000 with another code', limited(-32603, { event: -33000 }), -33000],
    ['event -33200 with another code', limited(-32603, { event: -33200 }), -33200],
  ])('Infura %s in a 200: alchemy answers', async (_n, body, quota) => {
    const out = logs()
    const f = mock(
      () => new Response(body),
      () => ok('0x2'),
    )
    const r = await rpc(req('eth_getBalance', [`0x${'ab'.repeat(20)}`, 'latest']))
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ jsonrpc: '2.0', id: 7, result: '0x2' })
    expect(f).toHaveBeenCalledTimes(2)
    expect(String(f.mock.calls[1]![0])).toContain('alchemy')
    expect(events(out)).toContainEqual(
      expect.objectContaining({ event: 'rpc_upstream_failed', upstream: 'infura', quota }),
    )
    noKeys(out.join('\n'))
  })

  it('a send falls back on a quota error too', async () => {
    const f = mock(
      () => new Response(infuraThroughput),
      () => ok('0xhash'),
    )
    const r = await rpc(req('eth_sendRawTransaction', ['0x02']))
    expect(await r.json()).toEqual({ jsonrpc: '2.0', id: 7, result: '0xhash' })
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('both upstreams out of quota: 503 unavailable, never the quota error', async () => {
    const out = logs()
    mock(
      () => new Response(infuraCap),
      () => new Response(infuraThroughput),
    )
    const r = await rpc(req('eth_blockNumber'))
    const text = await r.text()
    expect(r.status).toBe(503)
    expect(JSON.parse(text)).toMatchObject({ code: 'unavailable', retryable: true })
    expect(text).not.toContain('limit')
    noKeys(text + out.join('\n'))
  })

  it('a quota error from alchemy, the fallback, is a failure too', async () => {
    mock(
      () => new Response('boom', { status: 502 }),
      () => new Response(infuraThroughput),
    )
    const r = await rpc(req('eth_blockNumber'))
    expect(r.status).toBe(503)
    expect(await r.json()).toMatchObject({ code: 'unavailable', retryable: true })
  })

  it.each([-32000, -32602, -32603])('error code %i is a real answer: no second call', async (code) => {
    const body = limited(code)
    const f = mock(() => new Response(body))
    const r = await rpc(req('eth_getBalance', [`0x${'ab'.repeat(20)}`, 'latest']))
    expect(await r.text()).toBe(body)
    expect(f).toHaveBeenCalledTimes(1)
  })
})

// API-1: more faults of one upstream. The other upstream answers, so the user sees an answer, never a 500 and never a key.
describe('one faulty upstream', () => {
  it.each([
    ['truncated JSON', () => new Response('{"jsonrpc":')],
    ['empty body', () => new Response('')],
    ['a key echoed in the result', () => ok(`https://sepolia.infura.io/v3/${E.INFURA_KEY}`)],
  ])('Infura answers %s: alchemy answers', async (_n, bad) => {
    const out = logs()
    const f = mock(bad, () => ok('0x2'))
    const r = await rpc(req('eth_blockNumber'))
    const text = await r.text()
    expect(r.status).toBe(200)
    expect(JSON.parse(text)).toEqual({ jsonrpc: '2.0', id: 7, result: '0x2' })
    expect(f).toHaveBeenCalledTimes(2)
    noKeys(text + out.join('\n'))
  })

  it('Alchemy echoes its key as the fallback: 503, not the key', async () => {
    const out = logs()
    mock(
      () => new Response('boom', { status: 502 }),
      () => ok(`https://eth-sepolia.g.alchemy.com/v2/${E.ALCHEMY_KEY}`),
    )
    const r = await rpc(req('eth_blockNumber'))
    const text = await r.text()
    expect(r.status).toBe(503)
    noKeys(text + out.join('\n'))
  })
})

// API-1: both upstreams hang. Each call stops after UPSTREAM_TIMEOUT_MS (5 s). A read starts both at once (hedge after 60 ms); a send never
// hedges, so Alchemy starts only when Infura has timed out. `AbortSignal.timeout` is native and ignores fake timers, so it is rebuilt on `setTimeout`.
describe('both upstreams hang', () => {
  afterEach(() => vi.useRealTimers())

  const hang = () => {
    let first!: () => void
    const called = new Promise<void>((r) => (first = r))
    const f = vi.fn((_url: unknown, init: RequestInit) => {
      first()
      return new Promise<Response>((_res, rej) =>
        init.signal?.addEventListener('abort', () => rej(init.signal?.reason as Error)),
      )
    })
    vi.stubGlobal('fetch', f)
    return { f, called }
  }
  /** Starts the request on a fake clock and returns its answer plus the `request` log line, whose `duration_ms` is fake time. */
  const start = async (body: unknown) => {
    const out = logs()
    const auth = await bearer() // real crypto first, then the clock is faked
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms) => {
      const c = new AbortController()
      setTimeout(() => c.abort(new DOMException('timed out', 'TimeoutError')), ms)
      return c.signal
    })
    const answer = app.request(
      '/v1/rpc',
      {
        method: 'POST',
        headers: { 'X-App-Version': '1.0.0', 'content-type': 'application/json', ...auth },
        body: JSON.stringify(body),
      },
      E,
    )
    const took = () => {
      const line = out.find((l) => l.includes('"event":"request"'))
      return line === undefined ? undefined : (JSON.parse(line) as { duration_ms: number }).duration_ms
    }
    return { answer, out, timeout, took }
  }

  it('a read ends in 503 within 5.1 s', async () => {
    const { f, called } = hang()
    const { answer, out, timeout, took } = await start(req('eth_blockNumber'))
    await called
    await vi.advanceTimersByTimeAsync(60)
    expect(f).toHaveBeenCalledTimes(2) // the hedge started alchemy
    await vi.advanceTimersByTimeAsync(5040)
    const r = await answer
    expect(r.status).toBe(503)
    expect(await r.json()).toMatchObject({ code: 'unavailable', retryable: true })
    expect(took()).toBeGreaterThanOrEqual(5000) // fake time: Alchemy's own timeout ended it
    expect(took()).toBeLessThanOrEqual(5100)
    expect(timeout.mock.calls).toEqual([[5000], [5000]])
    expect(f).toHaveBeenCalledTimes(2)
    noKeys(out.join('\n'))
  })

  it('a send ends in 503 within 10.1 s: Alchemy starts only after Infura timed out', async () => {
    const { f, called } = hang()
    const { answer, out, took } = await start(req('eth_sendRawTransaction', ['0x02']))
    await called
    await vi.advanceTimersByTimeAsync(4999)
    expect(f).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(f).toHaveBeenCalledTimes(2)
    expect(String(f.mock.calls[1]![0])).toContain('alchemy')
    await vi.advanceTimersByTimeAsync(5100)
    const r = await answer
    expect(r.status).toBe(503)
    expect(took()).toBeGreaterThanOrEqual(10_000)
    expect(took()).toBeLessThanOrEqual(10_100)
    expect(f).toHaveBeenCalledTimes(2)
    noKeys(out.join('\n'))
  })
})

// #399: Infura's latency swings run to run. A read that Infura has not answered in HEDGE_MS also goes to Alchemy; the first valid answer wins.
describe('hedged reads', () => {
  const slow = (ms: number, res: () => Response) => () => new Promise<Response>((r) => setTimeout(() => r(res()), ms))

  it('a slow primary read is answered by alchemy; the slow call is aborted and not logged as failed', async () => {
    let signal: AbortSignal | undefined
    const f = vi.fn()
    f.mockImplementationOnce((_u: string, init: RequestInit) => {
      signal = init.signal ?? undefined
      return new Promise<Response>((res, rej) => {
        const t = setTimeout(() => res(ok('0x1')), 1000)
        signal?.addEventListener('abort', () => {
          clearTimeout(t)
          rej(new Error('aborted'))
        })
      })
    })
    f.mockImplementationOnce(() => Promise.resolve(ok('0x2')))
    vi.stubGlobal('fetch', f)
    const logs: string[] = []
    vi.spyOn(console, 'log').mockImplementation((...a) => void logs.push(a.join(' ')))
    vi.spyOn(console, 'error').mockImplementation((...a) => void logs.push(a.join(' ')))
    const t0 = Date.now()
    const r = await rpc(req('eth_blockNumber'))
    expect(await r.json()).toEqual({ jsonrpc: '2.0', id: 7, result: '0x2' })
    expect(Date.now() - t0).toBeLessThan(800)
    expect(String(f.mock.calls[1]![0])).toContain('alchemy')
    await new Promise((res) => setTimeout(res, 0))
    expect(signal?.aborted).toBe(true)
    expect(logs.join('\n')).not.toContain('rpc_upstream_failed')
    expect(logs.join('\n')).toMatch(/rpc_hedged.*alchemy/)
    vi.restoreAllMocks()
  })

  it('a fast null from alchemy waits for the slow primary receipt', async () => {
    const receipt = { status: '0x1' }
    mock(
      slow(400, () => ok(receipt)),
      () => ok(null),
    )
    const r = await rpc(req('eth_getTransactionReceipt', [`0x${'ab'.repeat(32)}`]))
    expect(await r.json()).toEqual({ jsonrpc: '2.0', id: 7, result: receipt })
  })

  it('a hedged null is used when the primary then fails', async () => {
    mock(
      slow(300, () => new Response('x', { status: 502 })),
      () => ok(null),
    )
    const r = await rpc(req('eth_getTransactionReceipt', [`0x${'ab'.repeat(32)}`]))
    expect(await r.json()).toEqual({ jsonrpc: '2.0', id: 7, result: null })
  })

  it('a fast primary read sends nothing to alchemy', async () => {
    const f = mock(
      () => ok('0x1'),
      () => ok('0x2'),
    )
    await rpc(req('eth_blockNumber'))
    await new Promise((r) => setTimeout(r, 300))
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('never hedges eth_sendRawTransaction: the second node could answer "already known" for a send that worked', async () => {
    const f = mock(
      slow(400, () => ok('0xhash')),
      () => ok('0xother'),
    )
    const r = await rpc(req('eth_sendRawTransaction', ['0x02']))
    expect(await r.json()).toEqual({ jsonrpc: '2.0', id: 7, result: '0xhash' })
    expect(f).toHaveBeenCalledTimes(1)
  })

  // CHAIN-4: Alchemy can lag Infura by a block, and a lagging nonce is a real number, not a null, so it would win the hedge.
  // A stale nonce then fails the send with "nonce too low" (Unknown in the app).
  describe('the nonce read', () => {
    const nonce = (tag: string) => req('eth_getTransactionCount', [`0x${'ab'.repeat(20)}`, tag])

    it.each(['pending', 'safe', 'latest'])(
      'is not hedged (%s): Alchemy gets no call while Infura answers',
      async (tag) => {
        const f = mock(
          slow(200, () => ok('0x5')),
          () => ok('0x4'),
        )
        const r = await rpc(nonce(tag))
        expect(await r.json()).toEqual({ jsonrpc: '2.0', id: 7, result: '0x5' })
        expect(f).toHaveBeenCalledTimes(1)
        expect(String(f.mock.calls[0]![0])).toContain('infura')
      },
    )

    it('still falls back when Infura fails', async () => {
      const f = mock(
        slow(100, () => new Response('boom', { status: 502 })),
        () => ok('0x4'),
      )
      const r = await rpc(nonce('pending'))
      expect(await r.json()).toEqual({ jsonrpc: '2.0', id: 7, result: '0x4' })
      expect(f).toHaveBeenCalledTimes(2)
    })
  })

  it('a quota error from the hedge is no answer when Infura then fails: 503, not the quota error', async () => {
    const f = mock(
      slow(100, () => new Response('boom', { status: 502 })),
      () => new Response(JSON.stringify({ jsonrpc: '2.0', id: 7, error: { code: 429, message: 'limit' } })),
    )
    const r = await rpc(req('eth_blockNumber'))
    const text = await r.text()
    expect(r.status).toBe(503)
    expect(JSON.parse(text)).toMatchObject({ code: 'unavailable', retryable: true })
    expect(text).not.toContain('limit')
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('a 429 from the hedge leaves the slow primary answer in charge', async () => {
    const f = mock(
      slow(300, () => ok('0x1')),
      () => new Response('slow down', { status: 429 }),
    )
    const r = await rpc(req('eth_blockNumber'))
    expect(await r.json()).toEqual({ jsonrpc: '2.0', id: 7, result: '0x1' })
    expect(f).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['a JSON-RPC error', { code: -32000, message: 'header not found' }],
    ['a quota error', { code: 429, message: 'limit' }],
  ])('%s from the hedge does not beat a slow primary', async (_n, error) => {
    const f = mock(
      slow(300, () => ok('0x1')),
      () => new Response(JSON.stringify({ jsonrpc: '2.0', id: 7, error })),
    )
    const r = await rpc(req('eth_blockNumber'))
    expect(await r.json()).toEqual({ jsonrpc: '2.0', id: 7, result: '0x1' })
    expect(f).toHaveBeenCalledTimes(2)
  })
})

describe('Analytics Engine point per request (API-4)', () => {
  type Point = { indexes?: string[]; blobs?: string[]; doubles?: number[] }
  const withPoints = () => {
    const points: Point[] = []
    const e = { ...E, ANALYTICS: { writeDataPoint: (p: Point) => void points.push(p) } as AnalyticsEngineDataset }
    return { e, rpcPoints: () => points.filter((p) => p.indexes?.[0] === 'rpc') }
  }

  it('one point for an answered read: method, ok, infura, not hedged; 1 Infura call, 0 Alchemy calls', async () => {
    mock(() => ok('0x1'))
    const { e, rpcPoints } = withPoints()
    expect((await rpc(req('eth_blockNumber'), e)).status).toBe(200)
    expect(rpcPoints()).toEqual([
      { indexes: ['rpc'], blobs: ['eth_blockNumber', 'ok', 'infura', '0'], doubles: [expect.any(Number), 1, 0] },
    ])
  })

  it('a fallback after an Infura failure counts both calls and names Alchemy', async () => {
    mock(
      () => new Response('x', { status: 502 }),
      () => ok('0x2'),
    )
    const { e, rpcPoints } = withPoints()
    await rpc(req('eth_blockNumber'), e)
    expect(rpcPoints()).toMatchObject([
      { blobs: ['eth_blockNumber', 'ok', 'alchemy', '0'], doubles: [expect.any(Number), 1, 1] },
    ])
  })

  it('a hedged read is marked hedged (the 60 ms timer fired)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      mock(
        () => new Promise<Response>((r) => setTimeout(() => r(ok('0x1')), 500)),
        () => ok('0x2'),
      )
      const { e, rpcPoints } = withPoints()
      const pending = rpc(req('eth_blockNumber'), e)
      await vi.advanceTimersByTimeAsync(100)
      await pending
      expect(rpcPoints()).toMatchObject([
        { blobs: ['eth_blockNumber', 'ok', 'alchemy', '1'], doubles: [expect.any(Number), 1, 1] },
      ])
    } finally {
      vi.useRealTimers()
    }
  })

  it('a hedge that fired while Infura then answered first: infura wins, hedged 1, 1 Alchemy call', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      mock(
        () => new Promise<Response>((r) => setTimeout(() => r(ok('0x1')), 100)),
        () => new Promise<Response>((r) => setTimeout(() => r(ok('0x2')), 1000)),
      )
      const { e, rpcPoints } = withPoints()
      const pending = rpc(req('eth_blockNumber'), e)
      await vi.advanceTimersByTimeAsync(150)
      await pending
      expect(rpcPoints()).toMatchObject([
        { blobs: ['eth_blockNumber', 'ok', 'infura', '1'], doubles: [expect.any(Number), 1, 1] },
      ])
    } finally {
      vi.useRealTimers()
    }
  })

  it('both upstreams failing is one point with outcome unavailable', async () => {
    mock(
      () => new Response('x', { status: 502 }),
      () => new Response('x', { status: 502 }),
    )
    const { e, rpcPoints } = withPoints()
    expect((await rpc(req('eth_blockNumber'), e)).status).toBe(503)
    expect(rpcPoints()).toMatchObject([
      { blobs: ['eth_blockNumber', 'unavailable', 'none', '0'], doubles: [expect.any(Number), 1, 1] },
    ])
  })

  it('a background call (hedge off, push.ts) writes no point: one run makes hundreds of calls, 250 points at most', async () => {
    mock(() => ok('0x1'))
    const { e, rpcPoints } = withPoints()
    expect(await proxyRpc(e, req('eth_blockNumber') as never, false)).not.toBeNull()
    expect(rpcPoints()).toEqual([])
  })

  it('a refused method writes no rpc point and no upstream call', async () => {
    const f = mock(() => ok())
    const { e, rpcPoints } = withPoints()
    expect((await rpc(req('debug_traceCall'), e)).status).toBe(403)
    expect(rpcPoints()).toEqual([])
    expect(f).not.toHaveBeenCalled()
  })

  it('never carries params, an address, a key or a hash; an Analytics Engine error does not fail the request', async () => {
    mock(() => ok('0x1'))
    const { e, rpcPoints } = withPoints()
    await rpc(call({}), e)
    const text = JSON.stringify(rpcPoints())
    expect(text).not.toContain('abab')
    noKeys(text)
    mock(() => ok('0x1'))
    const bad = {
      ...E,
      ANALYTICS: {
        writeDataPoint: () => {
          throw new Error('x')
        },
      } as unknown as AnalyticsEngineDataset,
    }
    expect((await rpc(req('eth_blockNumber'), bad)).status).toBe(200)
  })
})
