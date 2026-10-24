import { env } from 'cloudflare:workers'
import { USDC_SEPOLIA } from '@vaultme/contracts'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { app } from '../src/app.ts'
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
afterEach(() => vi.unstubAllGlobals())

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
