import { CLOCK_SKEW_SECONDS, INSTALL_ID_HEADER, NONCE_HEADER, PublicKey, SIGNATURE_HEADER, Signature, TIMESTAMP_HEADER, canonicalString } from '@vaultme/contracts'
import { describe, expect, it } from 'vitest'
import { createApiClient, type DeviceStore } from '../src/shared/api/client'
import { newPrivateKeyHex, publicKeyB64u, sha256Hex, signCanonical } from '../src/shared/api/deviceKey'
import { ApiError, RpcError } from '../src/shared/api/errors'

// Test key only (not a wallet key, never leaves this file).
const TEST_KEY = '11'.repeat(32)
const enc = new TextEncoder()
const b64uDecode = (s: string) => Uint8Array.from(atob(s.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0))
const importPub = (b64u: string) => crypto.subtle.importKey('raw', b64uDecode(b64u), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
const verify = async (pub: string, sig: string, canonical: string) =>
  crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, await importPub(pub), b64uDecode(sig), enc.encode(canonical))

describe('device key signing', () => {
  // Same vector as packages/contracts/test/contracts.test.ts: the string the server builds.
  const VECTOR =
    'vaultme-v1\nPOST\n/v1/installs/token\n123e4567-e89b-42d3-a456-426614174000\n1760400000\nAAAAAAAAAAAAAAAAAAAAAA\ne3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'

  it('canonicalString from the mobile inputs equals the contracts vector (empty body hash)', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    expect(canonicalString({ method: 'POST', path: '/v1/installs/token', installId: '123e4567-e89b-42d3-a456-426614174000', ts: 1760400000, nonce: 'AAAAAAAAAAAAAAAAAAAAAA', bodySha256Hex: sha256Hex('') })).toBe(VECTOR)
  })
  it('a noble-produced r||s signature verifies with WebCrypto, and the key and signature have the contract shapes', async () => {
    const pub = publicKeyB64u(TEST_KEY)
    const sig = signCanonical(TEST_KEY, VECTOR)
    expect(PublicKey.safeParse(pub).success).toBe(true)
    expect(Signature.safeParse(sig).success).toBe(true)
    expect(await verify(pub, sig, VECTOR)).toBe(true)
    expect(await verify(pub, sig, VECTOR + 'x')).toBe(false)
  })
  it('random keys work too', async () => {
    const k = newPrivateKeyHex()
    expect(await verify(publicKeyB64u(k), signCanonical(k, VECTOR), VECTOR)).toBe(true)
  })
})

// --- a small server stand-in that verifies like apps/api (WebCrypto, canonicalString) ---
function setup(over: { appVersion?: string } = {}) {
  const t = { ms: 1_760_400_000_000 }
  const server = {
    installs: new Map<string, string>(),
    registers: 0,
    tokens: 0,
    rpcCalls: [] as { auth: string | null; version: string | null; body: unknown }[],
    reject401: 0, // next N rpc calls answer 401 unauthorized
    tokenReply: null as null | { status: number; body: unknown },
    rpcReply: null as null | { status: number; body: unknown },
    nonces: new Set<string>(),
  }
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  const f = (async (url: string, init: RequestInit) => {
    const path = new URL(url).pathname
    const h = new Headers(init.headers)
    const sec = Math.floor(t.ms / 1000)
    if (path === '/v1/installs') {
      server.registers++
      const id = crypto.randomUUID()
      server.installs.set(id, (JSON.parse(init.body as string) as { publicKey: string }).publicKey)
      return json(201, { installId: id })
    }
    if (path === '/v1/installs/token') {
      if (server.tokenReply) return json(server.tokenReply.status, server.tokenReply.body)
      const id = h.get(INSTALL_ID_HEADER) ?? ''
      const pub = server.installs.get(id)
      if (!pub) return json(401, { code: 'unauthorized', message: 'Unknown install', retryable: false })
      const ts = Number(h.get(TIMESTAMP_HEADER))
      if (Math.abs(sec - ts) > CLOCK_SKEW_SECONDS) return json(401, { code: 'clock_skew', message: 'x', retryable: false })
      const canonical = canonicalString({ method: init.method ?? '', path, installId: id, ts, nonce: h.get(NONCE_HEADER) ?? '', bodySha256Hex: sha256Hex(init.body === undefined ? '' : (init.body as string)) })
      if (!(await verify(pub, h.get(SIGNATURE_HEADER) ?? '', canonical))) return json(401, { code: 'signature_invalid', message: 'x', retryable: false })
      const n = h.get(NONCE_HEADER) ?? ''
      if (server.nonces.has(n)) return json(401, { code: 'nonce_reused', message: 'x', retryable: false })
      server.nonces.add(n)
      server.tokens++
      return json(200, { token: `tok${server.tokens}`, expiresAt: sec + 900 })
    }
    if (path === '/v1/rpc' || path === '/v1/history') {
      server.rpcCalls.push({ auth: h.get('Authorization'), version: h.get('X-App-Version'), body: JSON.parse(init.body as string) })
      if (server.reject401 > 0) {
        server.reject401--
        return json(401, { code: 'unauthorized', message: 'Token expired', retryable: false })
      }
      if (server.rpcReply) return json(server.rpcReply.status, server.rpcReply.body)
      return json(200, { jsonrpc: '2.0', id: 1, result: '0x1' })
    }
    return json(404, { code: 'not_found', message: 'x', retryable: false })
  }) as unknown as typeof fetch

  let key: string | null = null
  let installId: string | null = null
  const store: DeviceStore = {
    loadKey: async () => key,
    saveKey: async (hex) => void (key = hex),
    getInstallId: () => installId,
    setInstallId: (id) => void (installId = id),
  }
  const client = () => createApiClient({ baseUrl: 'http://x.test/', appVersion: over.appVersion ?? '1.2.3', store, fetch: f, now: () => t.ms })
  return { t, server, client, store, state: () => ({ key, installId }) }
}

describe('api client', () => {
  it('registers once, gets a signed token, sends X-App-Version and Bearer; later calls reuse both', async () => {
    const s = setup()
    const c = s.client()
    expect(await c.rpc('eth_chainId')).toBe('0x1')
    await c.rpc('eth_blockNumber')
    expect(s.server.registers).toBe(1)
    expect(s.server.tokens).toBe(1)
    expect(s.server.rpcCalls.map((x) => [x.auth, x.version])).toEqual([['Bearer tok1', '1.2.3'], ['Bearer tok1', '1.2.3']])
    expect(s.server.rpcCalls[0]?.body).toMatchObject({ jsonrpc: '2.0', method: 'eth_chainId', params: [] })
    // The key is stored as hex, the public half is what the server holds.
    expect(s.server.installs.get(s.state().installId!)).toBe(publicKeyB64u(s.state().key!))
  })
  it('a new client with the same store does not register again', async () => {
    const s = setup()
    await s.client().rpc('eth_chainId')
    await s.client().rpc('eth_chainId')
    expect(s.server.registers).toBe(1)
    expect(s.server.tokens).toBe(2)
  })
  it('refreshes the token before expiresAt, not after', async () => {
    const s = setup()
    const c = s.client()
    await c.rpc('eth_chainId')
    s.t.ms += 10 * 60_000 // 10 min of 15
    await c.rpc('eth_chainId')
    expect(s.server.tokens).toBe(1)
    s.t.ms += 4 * 60_000 + 10_000 // 14 min 10 s: inside the 60 s margin
    await c.rpc('eth_chainId')
    expect(s.server.tokens).toBe(2)
    expect(s.server.rpcCalls.at(-1)?.auth).toBe('Bearer tok2')
  })
  it('retries once with a fresh token on 401 unauthorized', async () => {
    const s = setup()
    const c = s.client()
    s.server.reject401 = 1
    expect(await c.rpc('eth_chainId')).toBe('0x1')
    expect(s.server.tokens).toBe(2)
    expect(s.server.rpcCalls.map((x) => x.auth)).toEqual(['Bearer tok1', 'Bearer tok2'])
  })
  it('gives up after one retry', async () => {
    const s = setup()
    s.server.reject401 = 5
    await expect(s.client().rpc('eth_chainId')).rejects.toMatchObject({ code: 'unauthorized' })
    expect(s.server.rpcCalls).toHaveLength(2)
  })
  it('registers the same key again when the server does not know the install', async () => {
    const s = setup()
    await s.client().rpc('eth_chainId')
    const key = s.state().key
    s.server.installs.clear() // server database reset
    await s.client().rpc('eth_chainId')
    expect(s.server.registers).toBe(2)
    expect(s.state().key).toBe(key)
  })
  it('426 -> update_required', async () => {
    const s = setup()
    s.server.rpcReply = { status: 426, body: { code: 'update_required', message: 'Update the app to continue', retryable: false } }
    const e = await s.client().rpc('eth_chainId').catch((x: unknown) => x)
    expect(e).toBeInstanceOf(ApiError)
    expect(e).toMatchObject({ code: 'update_required', status: 426 })
  })
  it('426 without an envelope is still update_required', async () => {
    const s = setup()
    s.server.rpcReply = { status: 426, body: 'nope' }
    await expect(s.client().rpc('x')).rejects.toMatchObject({ code: 'update_required' })
  })
  it('an unknown error code maps to Unknown', async () => {
    const s = setup()
    s.server.rpcReply = { status: 418, body: { code: 'teapot', message: 'x', retryable: false } }
    await expect(s.client().rpc('x')).rejects.toMatchObject({ code: 'Unknown', status: 418 })
  })
  it('keeps the retryable flag of a known envelope', async () => {
    const s = setup()
    s.server.rpcReply = { status: 503, body: { code: 'unavailable', message: 'x', retryable: true } }
    await expect(s.client().rpc('x')).rejects.toMatchObject({ code: 'unavailable', retryable: true })
  })
  it('clock_skew from the token endpoint is a typed error', async () => {
    const s = setup()
    s.server.tokenReply = { status: 401, body: { code: 'clock_skew', message: 'Device clock is off', retryable: false } }
    await expect(s.client().rpc('x')).rejects.toMatchObject({ code: 'clock_skew' })
    expect(s.server.rpcCalls).toHaveLength(0)
  })
  it('a dropped connection is a network error', async () => {
    const c = createApiClient({ baseUrl: 'http://x.test', appVersion: '1.0.0', store: { loadKey: async () => TEST_KEY, saveKey: async () => undefined, getInstallId: () => 'i', setInstallId: () => undefined }, fetch: (async () => { throw new TypeError('offline') }) as typeof fetch })
    await expect(c.rpc('x')).rejects.toMatchObject({ code: 'network', retryable: true })
  })
  it('a JSON-RPC error is an RpcError', async () => {
    const s = setup()
    s.server.rpcReply = { status: 200, body: { jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'insufficient funds' } } }
    await expect(s.client().rpc('eth_estimateGas')).rejects.toBeInstanceOf(RpcError)
  })
  it('a null result is a result (receipt not found yet)', async () => {
    const s = setup()
    s.server.rpcReply = { status: 200, body: { jsonrpc: '2.0', id: 1, result: null } }
    expect(await s.client().rpc('eth_getTransactionReceipt', ['0x1'])).toBeNull()
  })
  it('history posts {address, cursor} to /v1/history with the token', async () => {
    const s = setup()
    s.server.rpcReply = { status: 200, body: { items: [] } }
    const addr = '0x' + 'a'.repeat(40)
    await s.client().history(addr, 'c1')
    expect(s.server.rpcCalls[0]).toMatchObject({ auth: 'Bearer tok1', body: { address: addr, cursor: 'c1' } })
  })
})
