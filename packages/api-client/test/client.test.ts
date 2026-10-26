import {
  CLOCK_SKEW_SECONDS,
  INSTALL_ID_HEADER,
  NONCE_HEADER,
  PublicKey,
  SIGNATURE_HEADER,
  Signature,
  TIMESTAMP_HEADER,
  canonicalString,
} from '@vaultme/contracts'
import { describe, expect, it } from 'vitest'
import { ApiError, RpcError, createApiClient, isApiError, type DeviceSigner } from '../src/index.ts'

const enc = new TextEncoder()
const b64u = (b: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(b)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
const b64uDecode = (s: string) =>
  Uint8Array.from(atob(s.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0))
const sha256Hex = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
const importPub = (pub: string) =>
  crypto.subtle.importKey('raw', b64uDecode(pub), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
const verify = async (pub: string, sig: string, canonical: string) =>
  crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, await importPub(pub), b64uDecode(sig), enc.encode(canonical))

/** In-memory test adapter: a non-extractable WebCrypto key, like the browser adapter will hold. */
function memorySigner(): DeviceSigner & { keys: number } {
  let pair: CryptoKeyPair | null = null
  let installId: string | null = null
  const pub = async (p: CryptoKeyPair) => b64u(await crypto.subtle.exportKey('raw', p.publicKey))
  return {
    keys: 0,
    publicKey: () => (pair ? pub(pair) : Promise.resolve(null)),
    async createKey() {
      this.keys++
      pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify'])
      return pub(pair)
    },
    async sign(text) {
      if (!pair) throw new Error('no key')
      return b64u(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, enc.encode(text)))
    },
    getInstallId: () => Promise.resolve(installId),
    setInstallId: (id) => {
      installId = id
      return Promise.resolve()
    },
  }
}

describe('token request signing', () => {
  // Same vector as packages/contracts/test/contracts.test.ts: the string the server builds.
  const VECTOR =
    'vaultme-v1\nPOST\n/v1/installs/token\n123e4567-e89b-42d3-a456-426614174000\n1760400000\nAAAAAAAAAAAAAAAAAAAAAA\ne3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'

  it('the empty-body hash in the vector is SHA-256 of ""', async () => {
    expect(await sha256Hex('')).toBe(VECTOR.split('\n').at(-1))
  })
  it('the test signer gives the contract shapes and a signature the server check accepts', async () => {
    const s = memorySigner()
    const pub = await s.createKey()
    const sig = await s.sign(VECTOR)
    expect(PublicKey.safeParse(pub).success).toBe(true)
    expect(Signature.safeParse(sig).success).toBe(true)
    expect(await verify(pub, sig, VECTOR)).toBe(true)
    expect(await verify(pub, sig, VECTOR + 'x')).toBe(false)
  })
})

// --- a small server stand-in that verifies like apps/api (WebCrypto, canonicalString) ---
function setup(over: { appVersion?: string; client?: 'web' } = {}) {
  const t = { ms: 1_760_400_000_000 }
  const server = {
    installs: new Map<string, string>(),
    registers: 0,
    registerDown: false, // POST /v1/installs drops the connection
    tokens: 0,
    rpcCalls: [] as { auth: string | null; version: string | null; client: string | null; body: unknown }[],
    reject401: 0, // next N rpc calls answer 401 unauthorized
    tokenReply: null as null | { status: number; body: unknown },
    rpcReply: null as null | { status: number; body: unknown },
    nonces: new Set<string>(),
    pushCalls: [] as { method: string; auth: string | null; body: unknown }[],
  }
  const json = (status: number, body: unknown) =>
    typeof body === 'string' && body.startsWith('<')
      ? new Response(body, { status }) // not JSON, e.g. a proxy error page
      : new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  const f = (async (url: string, init: RequestInit) => {
    const path = new URL(url).pathname
    const h = new Headers(init.headers)
    const sec = Math.floor(t.ms / 1000)
    if (path === '/v1/installs') {
      if (server.registerDown) throw new TypeError('offline')
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
      if (Math.abs(sec - ts) > CLOCK_SKEW_SECONDS)
        return json(401, { code: 'clock_skew', message: 'x', retryable: false })
      const canonical = canonicalString({
        method: init.method ?? '',
        path,
        installId: id,
        ts,
        nonce: h.get(NONCE_HEADER) ?? '',
        bodySha256Hex: await sha256Hex(init.body === undefined ? '' : (init.body as string)),
      })
      if (!(await verify(pub, h.get(SIGNATURE_HEADER) ?? '', canonical)))
        return json(401, { code: 'signature_invalid', message: 'x', retryable: false })
      const n = h.get(NONCE_HEADER) ?? ''
      if (server.nonces.has(n)) return json(401, { code: 'nonce_reused', message: 'x', retryable: false })
      server.nonces.add(n)
      server.tokens++
      return json(200, { token: `tok${String(server.tokens)}`, expiresAt: sec + 900 })
    }
    if (path === '/v1/rpc' || path === '/v1/history' || path === '/v1/tx/internal') {
      server.rpcCalls.push({
        auth: h.get('Authorization'),
        version: h.get('X-App-Version'),
        client: h.get('X-Client'),
        body: JSON.parse(init.body as string),
      })
      if (server.reject401 > 0) {
        server.reject401--
        return json(401, { code: 'unauthorized', message: 'Token expired', retryable: false })
      }
      if (server.rpcReply) return json(server.rpcReply.status, server.rpcReply.body)
      return json(200, { jsonrpc: '2.0', id: 1, result: '0x1' })
    }
    if (path === '/v1/push/subscription') {
      server.pushCalls.push({ method: init.method ?? '', auth: h.get('Authorization'), body: init.body })
      return json(200, { ok: true })
    }
    return json(404, { code: 'not_found', message: 'x', retryable: false })
  }) as unknown as typeof fetch

  const signer = memorySigner()
  const client = () =>
    createApiClient({
      baseUrl: 'http://x.test/',
      appVersion: over.appVersion ?? '1.2.3',
      signer,
      fetch: f,
      now: () => t.ms,
      ...(over.client ? { client: over.client } : {}),
    })
  return { t, server, client, signer }
}

describe('api client', () => {
  it('registers once, gets a signed token, sends X-App-Version and Bearer; later calls reuse both', async () => {
    const s = setup()
    const c = s.client()
    expect(await c.rpc('eth_chainId')).toBe('0x1')
    await c.rpc('eth_blockNumber')
    expect(s.server.registers).toBe(1)
    expect(s.server.tokens).toBe(1)
    expect(s.server.rpcCalls.map((x) => [x.auth, x.version])).toEqual([
      ['Bearer tok1', '1.2.3'],
      ['Bearer tok1', '1.2.3'],
    ])
    expect(s.server.rpcCalls[0]?.body).toMatchObject({ jsonrpc: '2.0', method: 'eth_chainId', params: [] })
    // The server holds the public half of the signer's key.
    expect(s.server.installs.get((await s.signer.getInstallId())!)).toBe(await s.signer.publicKey())
  })
  it('mobile sends no X-Client; the web client sends X-Client: web (separate minimum version, ADR-0011)', async () => {
    const mobile = setup()
    await mobile.client().rpc('eth_chainId')
    expect(mobile.server.rpcCalls[0]?.client).toBeNull()
    const web = setup({ client: 'web' })
    await web.client().rpc('eth_chainId')
    expect(web.server.rpcCalls[0]?.client).toBe('web')
  })
  it('a new client with the same signer does not register again', async () => {
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
    const key = await s.signer.publicKey()
    s.server.installs.clear() // server database reset
    await s.client().rpc('eth_chainId')
    expect(s.server.registers).toBe(2)
    expect(await s.signer.publicKey()).toBe(key)
    expect(s.signer.keys).toBe(1)
  })
  it('426 -> update_required', async () => {
    const s = setup()
    s.server.rpcReply = {
      status: 426,
      body: { code: 'update_required', message: 'Update the app to continue', retryable: false },
    }
    const e = await s
      .client()
      .rpc('eth_chainId')
      .catch((x: unknown) => x)
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
    expect(s.server.rpcCalls).toHaveLength(1) // only 401 unauthorized is retried
  })
  it('clock_skew from the token endpoint is a typed error', async () => {
    const s = setup()
    s.server.tokenReply = {
      status: 401,
      body: { code: 'clock_skew', message: 'Device clock is off', retryable: false },
    }
    await expect(s.client().rpc('x')).rejects.toMatchObject({ code: 'clock_skew' })
    expect(s.server.rpcCalls).toHaveLength(0)
  })
  it('a dropped connection is a network error', async () => {
    const c = createApiClient({
      baseUrl: 'http://x.test',
      appVersion: '1.0.0',
      signer: memorySigner(),
      fetch: () => Promise.reject(new TypeError('offline')),
    })
    await expect(c.rpc('x')).rejects.toMatchObject({ code: 'network', retryable: true })
  })
  it('a JSON-RPC error is an RpcError', async () => {
    const s = setup()
    s.server.rpcReply = {
      status: 200,
      body: { jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'insufficient funds' } },
    }
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
  it('txInternal posts {hash} to /v1/tx/internal with the token', async () => {
    const s = setup()
    s.server.rpcReply = { status: 200, body: { items: [] } }
    const hash = `0x${'8f'.repeat(32)}`
    expect(await s.client().txInternal(hash)).toEqual({ items: [] })
    expect(s.server.rpcCalls[0]).toMatchObject({ auth: 'Bearer tok1', body: { hash } })
  })
  it('push subscription: PUT {address, expoToken}, DELETE without a body, both with the token', async () => {
    const s = setup()
    const addr = '0x' + 'a'.repeat(40)
    const c = s.client()
    await c.putPushSubscription(addr, 'ExponentPushToken[abcdefgh12345678]')
    await c.deletePushSubscription()
    expect(s.server.pushCalls).toEqual([
      {
        method: 'PUT',
        auth: 'Bearer tok1',
        body: JSON.stringify({ address: addr, expoToken: 'ExponentPushToken[abcdefgh12345678]' }),
      },
      { method: 'DELETE', auth: 'Bearer tok1', body: undefined },
    ])
  })
  it('parallel first calls register once and share one token request', async () => {
    const s = setup()
    const c = s.client()
    await Promise.all([c.rpc('a'), c.rpc('b'), c.history('0x' + 'a'.repeat(40))])
    expect(s.server.registers).toBe(1)
    expect(s.server.tokens).toBe(1)
  })
  it('an installId without a key belongs to a lost key: make a new key and register it', async () => {
    const s = setup()
    await s.signer.setInstallId('stale-id')
    await s.client().rpc('eth_chainId')
    expect(s.signer.keys).toBe(1)
    expect(s.server.registers).toBe(1)
    expect(await s.signer.getInstallId()).not.toBe('stale-id')
  })
  it('a failed registration is tried again on the next call, with the same key', async () => {
    const s = setup()
    const c = s.client()
    s.server.registerDown = true
    await expect(c.rpc('x')).rejects.toMatchObject({ code: 'network' })
    s.server.registerDown = false
    expect(await c.rpc('x')).toBe('0x1')
    expect(s.signer.keys).toBe(1)
    expect(s.server.registers).toBe(1)
  })
  it('a body that does not match the contract is an Unknown error', async () => {
    const s = setup()
    s.server.rpcReply = { status: 200, body: { jsonrpc: '2.0', id: 1 } }
    await expect(s.client().rpc('x')).rejects.toMatchObject({ code: 'Unknown', message: 'rpc: no result' })
    s.server.rpcReply = { status: 200, body: 'not json-rpc' }
    await expect(s.client().rpc('x')).rejects.toMatchObject({ code: 'Unknown', message: 'unexpected response body' })
  })
  it('an error without an envelope keeps its status and a boolean retryable', async () => {
    const s = setup()
    s.server.rpcReply = { status: 502, body: { retryable: true } }
    await expect(s.client().rpc('x')).rejects.toMatchObject({ code: 'Unknown', status: 502, retryable: true })
  })
  it('a body that is not JSON is an Unknown error with its status', async () => {
    const s = setup()
    s.server.rpcReply = { status: 502, body: '<html>Bad Gateway</html>' }
    await expect(s.client().rpc('x')).rejects.toMatchObject({ code: 'Unknown', status: 502, retryable: false })
  })
})

describe('isApiError', () => {
  it('matches an ApiError, optionally by code', () => {
    const e = new ApiError('network', 0, true, 'x')
    expect(isApiError(e)).toBe(true)
    expect(isApiError(e, 'network')).toBe(true)
    expect(isApiError(e, 'clock_skew')).toBe(false)
    expect(isApiError(new Error('x'))).toBe(false)
  })
})
