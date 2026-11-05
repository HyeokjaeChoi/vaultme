import { env } from 'cloudflare:workers'
import { afterEach, expect, it, vi } from 'vitest'
import { app } from '../src/app.ts'
import { b64uEncode, issueToken } from '../src/auth.ts'

// #399: the bench splits the cold rpc wait into Worker time and upstream (Infura/Alchemy) time from this header.
const open: RateLimit = { limit: () => Promise.resolve({ success: true }) }
const rand = () => b64uEncode(crypto.getRandomValues(new Uint8Array(24)))
const E = {
  ...env,
  TOKEN_SECRET: rand() + rand(),
  INFURA_KEY: rand(),
  ALCHEMY_KEY: rand(),
  INSTALL_LIMITER: open,
  RPC_IP_LIMITER: open,
}
afterEach(() => vi.unstubAllGlobals())

it('/v1/rpc answers with Server-Timing total and upstream, and no other route does', async () => {
  vi.stubGlobal('fetch', () => Promise.resolve(Response.json({ jsonrpc: '2.0', id: 1, result: '0x1' })))
  const token = (await issueToken({ env: E } as never, crypto.randomUUID())).token
  const r = await app.request(
    '/v1/rpc',
    {
      method: 'POST',
      headers: { 'X-App-Version': '1.0.0', 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
    },
    E,
  )
  expect(r.status).toBe(200)
  expect(r.headers.get('server-timing')).toMatch(/^upstream;dur=[\d.]+,total;dur=[\d.]+;desc="Total Response Time"$/)
  expect((await app.request('/v1/health', {}, E)).headers.get('server-timing')).toBeNull()
})
