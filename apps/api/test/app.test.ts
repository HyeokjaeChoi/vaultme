import { env } from 'cloudflare:workers'
import {
  ErrorEnvelope,
  INSTALL_ID_HEADER,
  NONCE_HEADER,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  canonicalString,
} from '@vaultme/contracts'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { app, handleError } from '../src/app.ts'
import { b64uEncode, issueToken } from '../src/auth.ts'
import type { Env } from '../src/env.ts'
import { UpstreamError, retryAfter } from '../src/errors.ts'

const get = (path: string, headers: Record<string, string> = {}, e = env) => app.request(path, { headers }, e)
const V = { 'X-App-Version': '1.0.0' }
const WEB = 'https://web.example'
const web = { ...env, WEB_ORIGINS: `${WEB},https://other.example` }
const W = { ...V, 'X-Client': 'web', Origin: WEB }

describe('api', () => {
  it('health needs no version header', async () => {
    const r = await get('/v1/health')
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ ok: true, version: '0.1.0' })
    expect(r.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('426 when below MIN_APP_VERSION', async () => {
    const e = { ...env, MIN_APP_VERSION: '2.0.0' }
    const r = await get('/v1/anything', { 'X-App-Version': '1.9.9' }, e)
    expect(r.status).toBe(426)
    expect(await r.json()).toEqual({ code: 'update_required', message: 'Update the app to continue', retryable: false })
  })

  it('500 when MIN_APP_VERSION is malformed', async () => {
    const r = await get('/v1/anything', V, { ...env, MIN_APP_VERSION: '1.x' })
    expect(r.status).toBe(500)
    expect(await r.json()).toMatchObject({ code: 'internal' })
  })

  it('400 when version header is missing', async () => {
    const r = await get('/v1/anything')
    expect(r.status).toBe(400)
    expect(ErrorEnvelope.safeParse(await r.json()).success).toBe(true)
  })

  it('403 on an Origin that is not allowed, even for health', async () => {
    const r = await get('/v1/health', { Origin: 'https://evil.example' })
    expect(r.status).toBe(403)
    expect(await r.json<{ code: string }>()).toMatchObject({ code: 'origin_forbidden' })
    expect(r.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('403 on an allowed origin with a different scheme, port or subdomain', async () => {
    for (const o of ['http://web.example', 'https://web.example:8443', 'https://x.web.example', 'null'])
      expect((await get('/v1/health', { Origin: o }, web)).status).toBe(403)
  })

  it('trims WEB_ORIGINS entries and survives a missing var for non-browser calls', async () => {
    const r = await get(
      '/v1/health',
      { Origin: 'https://other.example' },
      { ...env, WEB_ORIGINS: `${WEB}, https://other.example` },
    )
    expect(r.status).toBe(200)
    expect((await get('/v1/health', {}, { ...env, WEB_ORIGINS: undefined } as never)).status).toBe(200)
  })

  it('403 on any Origin when WEB_ORIGINS is empty', async () => {
    const r = await get('/v1/health', { Origin: WEB }, { ...env, WEB_ORIGINS: '' })
    expect(r.status).toBe(403)
  })

  it('preflight from an allowed origin lists the client headers, before any version check', async () => {
    const asked = 'x-app-version,x-client,x-install-id,x-timestamp,x-nonce,x-signature,authorization,content-type'
    const r = await app.request(
      '/v1/rpc',
      {
        method: 'OPTIONS',
        headers: {
          Origin: WEB,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': asked,
        },
      },
      web,
    )
    expect(r.status).toBe(204)
    expect(r.headers.get('access-control-allow-origin')).toBe(WEB)
    expect(r.headers.get('access-control-allow-methods')).toContain('POST')
    const allowed = r.headers.get('access-control-allow-headers')?.toLowerCase().split(/,\s*/)
    for (const h of asked.split(',')) expect(allowed).toContain(h)
    expect(r.headers.get('vary')).toContain('Origin')
  })

  it('preflight from another origin is 403', async () => {
    const r = await app.request(
      '/v1/rpc',
      { method: 'OPTIONS', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' } },
      web,
    )
    expect(r.status).toBe(403)
    expect(r.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('request from an allowed origin gets CORS headers, also on errors', async () => {
    const ok = await get('/v1/health', { Origin: WEB }, web)
    expect(ok.status).toBe(200)
    expect(ok.headers.get('access-control-allow-origin')).toBe(WEB)
    const err = await get('/v1/nope', W, web)
    expect(err.status).toBe(404)
    expect(err.headers.get('access-control-allow-origin')).toBe(WEB)
  })

  it('CORS lets the browser read Retry-After', async () => {
    const r = await get('/v1/health', { Origin: WEB }, web)
    expect(r.headers.get('access-control-expose-headers')).toContain('Retry-After')
  })

  it('X-Client web uses MIN_WEB_VERSION, not MIN_APP_VERSION', async () => {
    const e = { ...web, MIN_APP_VERSION: '9.0.0', MIN_WEB_VERSION: '2.0.0' }
    expect((await get('/v1/nope', { ...W, 'X-App-Version': '2.0.0' }, e)).status).toBe(404)
    const old = await get('/v1/nope', { ...W, 'X-App-Version': '1.9.9' }, e)
    expect(old.status).toBe(426)
    expect(old.headers.get('access-control-allow-origin')).toBe(WEB)
    expect(await old.json<{ code: string }>()).toMatchObject({ code: 'update_required' })
  })

  it('mobile (no X-Client) ignores MIN_WEB_VERSION', async () => {
    const e = { ...env, MIN_APP_VERSION: '1.0.0', MIN_WEB_VERSION: '9.0.0' }
    expect((await get('/v1/nope', V, e)).status).toBe(404)
    expect((await get('/v1/nope', { ...V, 'X-Client': 'mobile' }, e)).status).toBe(404)
  })

  it('500 when MIN_WEB_VERSION is malformed', async () => {
    const r = await get('/v1/nope', W, { ...web, MIN_WEB_VERSION: '1.x' })
    expect(r.status).toBe(500)
  })

  it('webhook stays outside CORS and the version check', async () => {
    const web = { ...env, WEB_ORIGINS: WEB, ALCHEMY_SIGNING_KEY: 'test-signing-key' }
    for (const headers of [{}, { Origin: WEB }]) {
      const r = await app.request('/webhooks/alchemy', { method: 'POST', headers, body: '{}' }, web)
      expect(r.status).toBe(401)
      expect(r.headers.get('access-control-allow-origin')).toBeNull()
    }
    const bad = await app.request(
      '/webhooks/alchemy',
      { method: 'POST', headers: { Origin: 'https://evil.example' }, body: '{}' },
      web,
    )
    expect(bad.status).toBe(403)
  })

  it('404 envelope for unknown route', async () => {
    const r = await get('/v1/nope', V)
    expect(r.status).toBe(404)
    expect(await r.json()).toEqual({ code: 'not_found', message: 'Not found', retryable: false })
  })

  it('500 envelope has no stack', async () => {
    const boom = new Hono<Env>()
    boom.onError(handleError)
    boom.get('/x', () => {
      throw new Error('secret detail')
    })
    const r = await boom.request('/x')
    const text = await r.text()
    expect(r.status).toBe(500)
    expect(text).not.toContain('secret detail')
    expect(ErrorEnvelope.parse(JSON.parse(text))).toMatchObject({ code: 'internal' })
  })
})

// Retry-After (API-3, docs/plans/quality-gates.md): every 429 and every retryable 503 says how long to wait, in whole seconds from 1 to 86,400.
// One row per route. The OpenAPI document lists the routes that declare a 429 or a 503; a declared answer without a row fails here,
// so a new route cannot skip the header.
describe('Retry-After', () => {
  const open: RateLimit = { limit: () => Promise.resolve({ success: true }) }
  const closed: RateLimit = { limit: () => Promise.resolve({ success: false }) }
  const rand = () => b64uEncode(crypto.getRandomValues(new Uint8Array(24)))
  const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
  const grant = (wait: number | null) =>
    ({ getByName: () => ({ acquire: () => Promise.resolve(wait) }) }) as unknown as typeof env.ETHERSCAN_BUCKET
  const E = {
    ...env,
    TOKEN_SECRET: rand() + rand(),
    INFURA_KEY: rand(),
    ALCHEMY_KEY: rand(),
    ETHERSCAN_API_KEY: rand(),
    ALCHEMY_WEBHOOK_ID: 'wh_test',
    ALCHEMY_SIGNING_KEY: rand(),
    ALCHEMY_NOTIFY_TOKEN: rand(),
    EXPO_ACCESS_TOKEN: rand(),
    INSTALL_IP_LIMITER: open,
    INSTALL_LIMITER: open,
    RPC_IP_LIMITER: open,
    HISTORY_IP_LIMITER: open,
    ETHERSCAN_BUCKET: grant(0),
  }
  type Limiter = 'INSTALL_IP_LIMITER' | 'INSTALL_LIMITER' | 'RPC_IP_LIMITER' | 'HISTORY_IP_LIMITER'
  type Row = {
    auth: 'none' | 'token' | 'signed'
    body?: unknown
    limiters?: Limiter[] // each of these, closed, makes the route answer 429
    down?: { env?: Partial<typeof E>; fetch?: () => Promise<Response> } // what makes the route answer 503
  }
  const ADDRESS = `0x${'ab'.repeat(20)}`
  const unreachable = () => Promise.reject(new TypeError('fetch failed'))
  const ROWS: Record<string, Row> = {
    'POST /v1/installs': { auth: 'none', body: { publicKey: 'A'.repeat(87) }, limiters: ['INSTALL_IP_LIMITER'] },
    'POST /v1/installs/token': { auth: 'signed', limiters: ['INSTALL_LIMITER'] },
    'GET /v1/installs/me': { auth: 'token', limiters: ['INSTALL_LIMITER'] },
    'POST /v1/rpc': {
      auth: 'token',
      body: { jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] },
      limiters: ['RPC_IP_LIMITER', 'INSTALL_LIMITER'],
      down: { fetch: unreachable },
    },
    'POST /v1/history': {
      auth: 'token',
      body: { address: ADDRESS },
      limiters: ['HISTORY_IP_LIMITER', 'INSTALL_LIMITER'],
      down: { env: { ETHERSCAN_BUCKET: grant(null) } },
    },
    'POST /v1/tx/internal': {
      auth: 'token',
      body: { hash: `0x${'ab'.repeat(32)}` },
      limiters: ['HISTORY_IP_LIMITER', 'INSTALL_LIMITER'],
      down: { env: { ETHERSCAN_BUCKET: grant(null) } },
    },
    'PUT /v1/push/subscription': {
      auth: 'token',
      body: { address: ADDRESS, expoToken: 'ExponentPushToken[abcdefghijklmnop]' },
      limiters: ['INSTALL_LIMITER'],
      down: { fetch: () => Promise.resolve(new Response('no', { status: 500 })) }, // the Alchemy webhook address call
    },
    'DELETE /v1/push/subscription': { auth: 'token', limiters: ['INSTALL_LIMITER'] },
  }

  // A registered device that signs the request, like the mobile client does.
  const signedHeaders = async (method: string, path: string, body: string) => {
    const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ])) as CryptoKeyPair
    const publicKey = b64uEncode(new Uint8Array((await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer))
    const installId = crypto.randomUUID()
    await E.DB.prepare('INSERT INTO installs (id, public_key, created_at, last_seen_at) VALUES (?, ?, ?, ?)')
      .bind(installId, publicKey, 1, 1)
      .run()
    const ts = Math.floor(Date.now() / 1000)
    const nonce = rand()
    const canonical = canonicalString({
      method,
      path,
      installId,
      ts,
      nonce,
      bodySha256Hex: hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body))),
    })
    const sig = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      pair.privateKey,
      new TextEncoder().encode(canonical),
    )
    return {
      [INSTALL_ID_HEADER]: installId,
      [TIMESTAMP_HEADER]: String(ts),
      [NONCE_HEADER]: nonce,
      [SIGNATURE_HEADER]: b64uEncode(new Uint8Array(sig)),
    }
  }
  const call = async (key: string, row: Row, e: typeof E) => {
    const [method = '', path = ''] = key.split(' ')
    const body = row.body === undefined ? undefined : JSON.stringify(row.body)
    const headers: Record<string, string> = { 'X-App-Version': '1.0.0', 'content-type': 'application/json' }
    if (row.auth === 'token')
      headers.Authorization = `Bearer ${(await issueToken({ env: E } as never, crypto.randomUUID())).token}`
    if (row.auth === 'signed') Object.assign(headers, await signedHeaders(method, path, body ?? ''))
    return app.request(path, { method, headers, ...(body === undefined ? {} : { body }) }, e)
  }
  const waits = (r: Response) => {
    const v = r.headers.get('Retry-After')
    expect(String(v), 'Retry-After header').toMatch(/^[1-9]\d{0,4}$/)
    expect(Number(v)).toBeLessThanOrEqual(86_400)
  }
  afterEach(() => vi.unstubAllGlobals())

  type Operation = { responses?: Record<string, { headers?: Record<string, unknown> }> }
  const operations = () =>
    Object.entries(
      app.getOpenAPI31Document({ openapi: '3.1.0', info: { title: 'x', version: 'v1' } }).paths ?? {},
    ).flatMap(([path, item]) =>
      Object.entries(item as Record<string, Operation>).map(([method, op]) => ({
        key: `${method.toUpperCase()} ${path}`,
        op,
      })),
    )
  const declared = (status: string) =>
    operations()
      .filter(({ op }) => op.responses && status in op.responses)
      .map(({ key }) => key)
      .sort()
  const rowsWith = (pick: (r: Row) => unknown) =>
    Object.entries(ROWS)
      .filter(([, r]) => pick(r))
      .map(([k]) => k)
      .sort()

  it('has a row for every 429 and 503 the OpenAPI document declares, and no row for one it does not', () => {
    expect(rowsWith((r) => r.limiters)).toEqual(declared('429'))
    expect(rowsWith((r) => r.down)).toEqual(declared('503'))
  })

  it('the OpenAPI document declares Retry-After on every 429 and 503', () => {
    for (const { key, op } of operations())
      for (const status of ['429', '503'])
        if (op.responses?.[status])
          expect(op.responses[status].headers, `${key} ${status}`).toHaveProperty('Retry-After')
  })

  const limited = Object.entries(ROWS).flatMap(([k, r]) => (r.limiters ?? []).map((l) => [k, l] as const))
  it.each(limited)('%s answers 429 with Retry-After when %s says stop', async (key, limiter) => {
    const r = await call(key, ROWS[key]!, { ...E, [limiter]: closed })
    expect(r.status).toBe(429)
    waits(r)
  })

  it.each(Object.entries(ROWS).filter(([, r]) => r.down))(
    '%s answers 503 with Retry-After when its upstream is down',
    async (key, row) => {
      if (row.down?.fetch) vi.stubGlobal('fetch', vi.fn(row.down.fetch))
      const r = await call(key, row, { ...E, ...row.down?.env })
      expect(r.status).toBe(503)
      expect(await r.json()).toMatchObject({ code: 'unavailable', retryable: true })
      waits(r)
    },
  )

  it('the Alchemy webhook answers 503 with Retry-After when Expo is down', async () => {
    const id = crypto.randomUUID()
    await E.DB.prepare('INSERT INTO installs (id, public_key, created_at, last_seen_at) VALUES (?, ?, ?, ?)')
      .bind(id, 'k', 1, 1)
      .run()
    await E.DB.prepare(
      'INSERT INTO push_subscriptions (install_id, address, expo_token, locale, created_at) VALUES (?, ?, ?, ?, ?)',
    )
      .bind(id, ADDRESS, 'ExponentPushToken[abcdefghijklmnop]', 'en', 1)
      .run()
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('x', { status: 502 }))),
    )
    const deposit = {
      hash: `0x${'11'.repeat(32)}`,
      fromAddress: `0x${'cd'.repeat(20)}`,
      toAddress: ADDRESS,
      value: 0.5,
      asset: 'ETH',
      category: 'external',
      rawContract: { rawValue: '0x6f05b59d3b20000', decimals: 18 },
    }
    const raw = JSON.stringify({
      webhookId: 'wh_test',
      type: 'ADDRESS_ACTIVITY',
      event: { network: 'ETH_SEPOLIA', activity: [deposit] },
    })
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(E.ALCHEMY_SIGNING_KEY),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const mac = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)))
    const r = await app.request(
      '/webhooks/alchemy',
      { method: 'POST', headers: { 'X-Alchemy-Signature': mac }, body: raw },
      E,
    )
    expect(r.status).toBe(503)
    waits(r)
  })

  it('an upstream error that carries seconds sets the wait (the API-2 daily budget: seconds to 00:00 UTC)', async () => {
    // The stub rejects the way the Worker does. A real Durable Object must return a value and let etherscan.ts throw: an error that crosses
    // an RPC call loses its class (see UpstreamError).
    const budget = (seconds: number) =>
      ({
        getByName: () => ({ acquire: () => Promise.reject(new UpstreamError('daily budget', seconds)) }),
      }) as unknown as typeof env.ETHERSCAN_BUCKET
    for (const key of ['POST /v1/history', 'POST /v1/tx/internal']) {
      const asked = async (seconds: number) => call(key, ROWS[key]!, { ...E, ETHERSCAN_BUCKET: budget(seconds) })
      const half = await asked(5400.2)
      expect(half.status).toBe(503)
      expect(half.headers.get('Retry-After')).toBe('5401') // rounded up to whole seconds
      expect((await asked(90_000)).headers.get('Retry-After')).toBe('86400') // never more than one day
      expect((await asked(0)).headers.get('Retry-After')).toBe('1') // never less than one second
    }
  })

  it('retryAfter gives whole seconds from 1 to 86,400; NaN or no seconds means the route default', () => {
    const wait = (fallback: number, seconds?: number) =>
      retryAfter(fallback, seconds === undefined ? undefined : new UpstreamError('x', seconds))['Retry-After']
    expect(wait(2)).toBe('2')
    expect(wait(2.4)).toBe('3')
    expect(wait(2, 17)).toBe('17')
    for (const [seconds, want] of [
      [0, '1'],
      [-5, '1'],
      [Number.NEGATIVE_INFINITY, '1'],
      [0.2, '1'],
      [1.2, '2'],
      [86_400, '86400'],
      [86_400.5, '86400'],
      [Number.POSITIVE_INFINITY, '86400'],
      [Number.NaN, '2'], // not a number: the default of the route, never "NaN"
    ] as const)
      expect(wait(2, seconds), String(seconds)).toBe(want)
    expect(retryAfter(2, new UpstreamError('x'))['Retry-After']).toBe('2')
  })
})
