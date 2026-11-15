import { env } from 'cloudflare:workers'
import {
  INSTALL_ID_HEADER,
  NONCE_HEADER,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  canonicalString,
} from '@vaultme/contracts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../src/app.ts'
import { b64uEncode, issueToken, nowSeconds } from '../src/auth.ts'

// SEC-10 (docs/plans/quality-gates.md): what an attacker tries next. Every case answers a documented status and error code, makes
// 0 upstream fetches and writes nothing to D1 except the nonce row. A body over the limit is refused before any D1 read.
const open: RateLimit = { limit: () => Promise.resolve({ success: true }) }
const rand = () => b64uEncode(crypto.getRandomValues(new Uint8Array(24)))
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
const enc = new TextEncoder()
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
}

// Every statement the Worker sends to D1. Test setup uses the plain `env.DB`, so it is not counted.
const sqls: string[] = []
const R = {
  ...E,
  DB: new Proxy(env.DB, {
    get: (t, k) => {
      const v: unknown = Reflect.get(t, k)
      if (k === 'prepare')
        return (q: string) => {
          sqls.push(q)
          return t.prepare(q)
        }
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(t) : v
    },
  }),
}
const upstream = vi.fn(() => Promise.reject(new Error('unexpected upstream call')))
beforeEach(() => {
  sqls.length = 0
  upstream.mockClear()
  vi.stubGlobal('fetch', upstream)
})
afterEach(() => vi.unstubAllGlobals())

/** 0 upstream fetches, and no write to D1 except the nonce row. Reads are allowed. */
const quiet = () => {
  expect(upstream).not.toHaveBeenCalled()
  expect(sqls.filter((q) => !/^\s*select\b/i.test(q) && !/\bnonces\b/.test(q))).toEqual([])
}
const answer = async (r: Response, status: number, code: string) => {
  expect(r.status).toBe(status)
  expect(await r.json()).toMatchObject({ code })
  quiet()
}

const V = { 'X-App-Version': '1.0.0' }
const call = (path: string, init: RequestInit = {}, e: typeof R = R) =>
  app.request(path, { ...init, headers: { ...V, ...(init.headers as Record<string, string>) } }, e)
const bearer = async (e: typeof E = E) => ({
  Authorization: `Bearer ${(await issueToken({ env: e } as never, crypto.randomUUID())).token}`,
})

// A registered device, like the mobile client. Setup writes through `env.DB`.
async function device() {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair
  const publicKey = b64uEncode(new Uint8Array((await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer))
  const installId = crypto.randomUUID()
  await env.DB.prepare('INSERT INTO installs (id, public_key, created_at, last_seen_at) VALUES (?, ?, ?, ?)')
    .bind(installId, publicKey, nowSeconds(), nowSeconds())
    .run()
  const sign = async (method: string, path: string, body = '') => {
    const ts = nowSeconds()
    const nonce = rand()
    const canonical = canonicalString({
      method,
      path,
      installId,
      ts,
      nonce,
      bodySha256Hex: hex(await crypto.subtle.digest('SHA-256', enc.encode(body))),
    })
    const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, enc.encode(canonical))
    return {
      [INSTALL_ID_HEADER]: installId,
      [TIMESTAMP_HEADER]: String(ts),
      [NONCE_HEADER]: nonce,
      [SIGNATURE_HEADER]: b64uEncode(new Uint8Array(sig)),
    }
  }
  return { installId, sign }
}

describe('signed requests (POST /v1/installs/token)', () => {
  const PATH = '/v1/installs/token'
  type Headers = Record<string, string>
  type Mutation = (h: Headers, other: { installId: string }) => Headers
  const set =
    (name: string, value: string): Mutation =>
    (h) => ({ ...h, [name]: value })
  const cases: [string, Mutation, string][] = [
    // Format checks come first: nothing is read from D1.
    ...['abc', '1e9', '-5', '1234567890123', '', '12.5', '0x10'].map((v): [string, Mutation, string] => [
      `X-Timestamp "${v}"`,
      set(TIMESTAMP_HEADER, v),
      'unauthorized',
    ]),
    ...['', 'a'.repeat(21), 'a'.repeat(65), `${'a'.repeat(21)}+`, 'a b'.repeat(8)].map(
      (v): [string, Mutation, string] => [`X-Nonce "${v}"`, set(NONCE_HEADER, v), 'unauthorized'],
    ),
    ...['', 'A'.repeat(85), 'A'.repeat(87), '!'.repeat(86)].map((v): [string, Mutation, string] => [
      `X-Signature "${v}"`,
      set(SIGNATURE_HEADER, v),
      'unauthorized',
    ]),
    ...['', 'not-a-uuid', `${crypto.randomUUID()}x`].map((v): [string, Mutation, string] => [
      `X-Install-Id "${v}"`,
      set(INSTALL_ID_HEADER, v),
      'unauthorized',
    ]),
    // Well formed, but not what was signed.
    [
      'timestamp changed after signing',
      (h) => ({
        ...h,
        [TIMESTAMP_HEADER]: String(Number(h[TIMESTAMP_HEADER]) + 1),
      }),
      'signature_invalid',
    ],
    ['nonce changed after signing', set(NONCE_HEADER, rand()), 'signature_invalid'],
    [
      'one signature bit flipped',
      (h) => ({
        ...h,
        [SIGNATURE_HEADER]: (h[SIGNATURE_HEADER]?.startsWith('A') ? 'B' : 'A') + (h[SIGNATURE_HEADER] ?? '').slice(1),
      }),
      'signature_invalid',
    ],
    [
      'signed by another registered device',
      (h, other) => ({ ...h, [INSTALL_ID_HEADER]: other.installId }),
      'signature_invalid',
    ],
    ['timestamp far in the future', set(TIMESTAMP_HEADER, '999999999999'), 'clock_skew'],
  ]
  it.each(cases)('401 %s', async (_name, mutate, code) => {
    const d = await device()
    const headers = mutate(await d.sign('POST', PATH), await device())
    await answer(await call(PATH, { method: 'POST', headers }), 401, code)
  })

  it('401 signature_invalid when the body changed after signing', async () => {
    const d = await device()
    const headers = await d.sign('POST', PATH) // signed for an empty body
    await answer(await call(PATH, { method: 'POST', headers, body: '{"x":1}' }), 401, 'signature_invalid')
  })

  it('401 nonce_reused on a replay, and the replay adds no row', async () => {
    const d = await device()
    const headers = await d.sign('POST', PATH)
    expect((await call(PATH, { method: 'POST', headers })).status).toBe(200)
    sqls.length = 0
    await answer(await call(PATH, { method: 'POST', headers }), 401, 'nonce_reused')
    const rows = await env.DB.prepare('SELECT COUNT(*) AS n FROM nonces WHERE install_id = ?')
      .bind(d.installId)
      .first<{ n: number }>()
    expect(rows?.n).toBe(1)
  })
})

describe('bearer tokens (GET /v1/installs/me)', () => {
  const me = (authorization?: string) =>
    call('/v1/installs/me', {
      headers: authorization === undefined ? {} : { Authorization: authorization },
    })
  const fresh = async () => {
    const { token } = await issueToken({ env: E } as never, crypto.randomUUID())
    const [id, exp, mac] = token.split('.') as [string, string, string]
    return { token, id, exp, mac }
  }
  type Token = Awaited<ReturnType<typeof fresh>>

  it('200 with a good token (control)', async () => {
    expect((await me(`Bearer ${(await fresh()).token}`)).status).toBe(200)
  })

  it.each<[string, (t: Token) => Promise<string> | string]>([
    ['exp raised, old MAC', (t) => `Bearer ${t.id}.${String(Number(t.exp) + 3600)}.${t.mac}`],
    [
      'MAC made with another secret',
      async (t) =>
        `Bearer ${(await issueToken({ env: { ...E, TOKEN_SECRET: rand() + rand() } } as never, t.id)).token}`,
    ],
    ['MAC cut short', (t) => `Bearer ${t.id}.${t.exp}.${t.mac.slice(0, 42)}`],
    ['MAC one char too long', (t) => `Bearer ${t.id}.${t.exp}.${t.mac}A`],
    ['extra segment', (t) => `Bearer ${t.token}.x`],
    ['missing MAC', (t) => `Bearer ${t.id}.${t.exp}`],
    ['empty id', (t) => `Bearer .${t.exp}.${t.mac}`],
    ['id is not a uuid', (t) => `Bearer abc.${t.exp}.${t.mac}`],
    ['exp 1e9', (t) => `Bearer ${t.id}.1e9.${t.mac}`],
    ['exp -1', (t) => `Bearer ${t.id}.-1.${t.mac}`],
    ['exp with 13 digits', (t) => `Bearer ${t.id}.${'9'.repeat(13)}.${t.mac}`],
    ['lower-case scheme', (t) => `bearer ${t.token}`],
    ['two spaces after Bearer', (t) => `Bearer  ${t.token}`],
    ['another scheme', (t) => `Basic ${t.token}`],
    ['text after the token', (t) => `Bearer ${t.token} x`],
    ['no scheme', (t) => t.token],
    ['empty header', () => ''],
  ])('401 unauthorized: %s', async (_name, build) => {
    await answer(await me(await build(await fresh())), 401, 'unauthorized')
  })

  it('401 unauthorized with no header, and a token in the query string does not count', async () => {
    const { token } = await fresh()
    await answer(await me(), 401, 'unauthorized')
    await answer(await call(`/v1/installs/me?token=${token}&access_token=${token}`), 401, 'unauthorized')
  })
})

describe('rate limits are keyed by IP and by install (stub limiters count the calls)', () => {
  const counting = () => {
    const keys: string[] = []
    const limiter = {
      limit: ({ key }: { key: string }) => {
        keys.push(key)
        return Promise.resolve({ success: true })
      },
    } as RateLimit
    return { keys, limiter }
  }

  it('history and tx/internal draw from one IP budget; rpc has its own', async () => {
    const history = counting()
    const rpc = counting()
    const e = {
      ...R,
      HISTORY_IP_LIMITER: history.limiter,
      RPC_IP_LIMITER: rpc.limiter,
    }
    const headers = { 'CF-Connecting-IP': '198.51.100.7' }
    for (const path of ['/v1/history', '/v1/tx/internal', '/v1/rpc']) await call(path, { method: 'POST', headers }, e)
    expect(history.keys).toEqual(['198.51.100.7', '198.51.100.7'])
    expect(rpc.keys).toEqual(['198.51.100.7'])
    quiet()
  })

  it('the install limiter is keyed by the install id in the token, never by IP', async () => {
    const install = counting()
    const e = { ...R, INSTALL_LIMITER: install.limiter }
    const [a, b] = [crypto.randomUUID(), crypto.randomUUID()]
    for (const [id, ip] of [
      [a, '203.0.113.1'],
      [a, '203.0.113.2'],
      [b, '203.0.113.1'],
    ] as const) {
      const Authorization = `Bearer ${(await issueToken({ env: E } as never, id)).token}`
      expect((await call('/v1/installs/me', { headers: { Authorization, 'CF-Connecting-IP': ip } }, e)).status).toBe(
        200,
      )
    }
    expect(install.keys).toEqual([a, a, b])
  })
})

// The real Workers rate limit bindings of wrangler.jsonc (3 registrations per IP and 60 calls per install, per minute), not stubs.
// The window is aligned to the wall clock, so a run that crosses a minute is not a valid run: it is tried again with new keys.
describe('rate limits on the real bindings', () => {
  const real = { ...R, INSTALL_IP_LIMITER: env.INSTALL_IP_LIMITER, INSTALL_LIMITER: env.INSTALL_LIMITER }
  const withinOneMinute = async (run: () => Promise<void>) => {
    for (let attempt = 1; ; attempt++) {
      const minute = Math.floor(Date.now() / 60_000)
      try {
        await run()
        return
      } catch (e) {
        if (attempt === 3 || Math.floor(Date.now() / 60_000) === minute) throw e
      }
    }
  }
  const publicKey = async () => {
    const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ])) as CryptoKeyPair
    return b64uEncode(new Uint8Array((await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer))
  }

  it('the 4th registration from one IP in a minute is 429 with Retry-After 60, before any D1 step', () =>
    withinOneMinute(async () => {
      const headers = { 'CF-Connecting-IP': crypto.randomUUID(), 'content-type': 'application/json' }
      const register = async () =>
        call('/v1/installs', { method: 'POST', headers, body: JSON.stringify({ publicKey: await publicKey() }) }, real)
      for (let i = 0; i < 3; i++) expect((await register()).status).toBe(201)
      sqls.length = 0
      const r = await register()
      await answer(r, 429, 'rate_limited')
      expect(r.headers.get('Retry-After')).toBe('60')
      expect(sqls).toEqual([])
    }))

  it('the 61st call of one install in a minute is 429 with Retry-After 60; another install is not slowed', () =>
    withinOneMinute(async () => {
      const mine = await bearer()
      for (let i = 0; i < 60; i++) expect((await call('/v1/installs/me', { headers: mine }, real)).status).toBe(200)
      const r = await call('/v1/installs/me', { headers: mine }, real)
      await answer(r, 429, 'rate_limited')
      expect(r.headers.get('Retry-After')).toBe('60')
      expect((await call('/v1/installs/me', { headers: await bearer() }, real)).status).toBe(200)
    }))
})

describe('request body limit', () => {
  const LIMIT = 64 * 1024
  const chunked = (size: number) =>
    new ReadableStream<Uint8Array>({
      start(c) {
        for (let left = size; left > 0; left -= 4096) c.enqueue(new Uint8Array(Math.min(4096, left)).fill(120))
        c.close()
      },
    })
  const streamed = (size: number, path = '/v1/rpc', e: typeof R = R) =>
    app.request(
      new Request(`http://localhost${path}`, {
        method: 'POST',
        headers: V,
        body: chunked(size),
        duplex: 'half',
      } as RequestInit),
      undefined,
      e,
    )
  const routes = [
    ['POST', '/v1/installs'],
    ['POST', '/v1/installs/token'],
    ['POST', '/v1/rpc'],
    ['POST', '/v1/history'],
    ['POST', '/v1/tx/internal'],
    ['PUT', '/v1/push/subscription'],
    ['DELETE', '/v1/push/subscription'],
  ] as const

  // The table is the write routes of the OpenAPI document: a new route without a row fails here, and so does one that skips 413
  // (or 415, for a JSON body).
  it('every write route of the OpenAPI document is in the table and declares its body answers', () => {
    const doc = app.getOpenAPI31Document({ openapi: '3.1.0', info: { title: 'x', version: 'v1' } })
    const found = Object.entries(doc.paths ?? {}).flatMap(([path, item]) =>
      (['post', 'put', 'patch', 'delete'] as const).flatMap((m) => {
        const op = item[m]
        if (!op) return []
        const declared = Object.keys(op.responses ?? {})
        const json =
          op.requestBody !== undefined && 'content' in op.requestBody && 'application/json' in op.requestBody.content
        expect(declared, `${m} ${path}`).toContain('413')
        if (json) expect(declared, `${m} ${path}`).toContain('415')
        return [`${m.toUpperCase()} ${path}`]
      }),
    )
    expect(found.sort()).toEqual(routes.map(([m, p]) => `${m} ${p}`).sort())
  })

  // No credentials at all: the limit comes before any signature, token or D1 step.
  it.each(routes)('413 %s %s: a body over 64 KB is refused before auth and D1', async (method, path) => {
    await answer(await call(path, { method, body: 'x'.repeat(LIMIT + 1) }), 413, 'invalid_request')
    expect(sqls).toEqual([])
  })

  it.each(routes)('%s %s: a body of exactly 64 KB is not refused for its size', async (method, path) => {
    const r = await call(path, { method, body: 'x'.repeat(LIMIT) })
    expect(r.status).not.toBe(413)
    quiet()
  })

  it('413 on a body with no Content-Length (chunked), counted while it is read', async () => {
    await answer(await streamed(LIMIT + 1), 413, 'invalid_request')
    expect(sqls).toEqual([])
  })

  // A chunked body is counted before the route runs: no D1 select of the signed route, no unhandled_error log or Sentry event of the webhook.
  it.each([
    ['/v1/installs/token', 64 * 1024 + 1],
    ['/webhooks/alchemy', 1024 * 1024 + 1],
  ])('413 on a chunked body to %s, before any D1 step and without an error log', async (path, size) => {
    const logs = [vi.spyOn(console, 'log'), vi.spyOn(console, 'error'), vi.spyOn(console, 'warn')]
    try {
      await answer(await streamed(size, path), 413, 'invalid_request')
      expect(sqls).toEqual([])
      expect(logs.flatMap((l) => l.mock.calls).join('\n')).not.toContain('unhandled_error')
    } finally {
      logs.forEach((l) => l.mockRestore())
    }
  })

  it('a chunked body of exactly 64 KB goes through the limit', async () => {
    expect((await streamed(LIMIT)).status).toBe(401)
  })

  it('413 on a Content-Length over the limit, without reading the body', async () => {
    const r = await call('/v1/rpc', {
      method: 'POST',
      headers: { 'content-length': String(LIMIT + 1) },
      body: '{}',
    })
    await answer(r, 413, 'invalid_request')
    expect(sqls).toEqual([])
  })

  it('a valid token does not lift the limit', async () => {
    const r = await call('/v1/rpc', {
      method: 'POST',
      headers: await bearer(),
      body: 'x'.repeat(LIMIT + 1),
    })
    await answer(r, 413, 'invalid_request')
    expect(sqls).toEqual([])
  })

  it('a browser from an allowed origin can read the 413: the CORS headers are on it', async () => {
    const web = { ...R, WEB_ORIGINS: 'https://web.example' }
    const headers = { Origin: 'https://web.example', 'X-Client': 'web' }
    const r = await call('/v1/rpc', { method: 'POST', headers, body: 'x'.repeat(LIMIT + 1) }, web)
    await answer(r, 413, 'invalid_request')
    expect(r.headers.get('access-control-allow-origin')).toBe('https://web.example')
  })

  it('a preflight has no body and is not limited', async () => {
    const web = { ...R, WEB_ORIGINS: 'https://web.example' }
    const headers = {
      Origin: 'https://web.example',
      'Access-Control-Request-Method': 'POST',
    }
    expect((await app.request('/v1/rpc', { method: 'OPTIONS', headers }, web)).status).toBe(204)
  })
})

describe('Alchemy webhook (POST /webhooks/alchemy)', () => {
  const hmac = async (raw: string, key = E.ALCHEMY_SIGNING_KEY) =>
    hex(
      await crypto.subtle.sign(
        'HMAC',
        await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
        enc.encode(raw),
      ),
    )
  const hook = (body: string, signature?: string) =>
    app.request(
      '/webhooks/alchemy',
      {
        method: 'POST',
        headers: signature === undefined ? {} : { 'X-Alchemy-Signature': signature },
        body,
      },
      R,
    )
  const payload = JSON.stringify({
    webhookId: 'wh_test',
    type: 'ADDRESS_ACTIVITY',
    event: { network: 'ETH_SEPOLIA', activity: [] },
  })

  it('200 with a good signature (control)', async () => {
    expect((await hook(payload, await hmac(payload))).status).toBe(200)
  })

  it('401 when the signature was made over another body', async () => {
    await answer(await hook(payload.replace('wh_test', 'wh_evil'), await hmac(payload)), 401, 'unauthorized')
  })

  it('401 when the signature was made with another key, is missing, empty or not hex', async () => {
    await answer(await hook(payload, await hmac(payload, rand())), 401, 'unauthorized')
    await answer(await hook(payload), 401, 'unauthorized')
    await answer(await hook(payload, ''), 401, 'unauthorized')
    await answer(await hook(payload, 'zz'), 401, 'unauthorized')
  })

  it('400 when the signature is good but the body is not JSON, or not an Alchemy payload', async () => {
    await answer(await hook('not json', await hmac('not json')), 400, 'invalid_request')
    const other = JSON.stringify({ hello: 'world' })
    await answer(await hook(other, await hmac(other)), 400, 'invalid_request')
  })

  // Alchemy documents no maximum payload and retries a refused one, so the webhook gets 1 MiB. 64 KB + 1 is still read.
  it('413 over 1 MiB, before any signature work or D1 step; 64 KB + 1 is still read', async () => {
    await answer(await hook('x'.repeat(1024 * 1024 + 1), 'ab'.repeat(32)), 413, 'invalid_request')
    expect(sqls).toEqual([])
    await answer(await hook('x'.repeat(64 * 1024 + 1), 'ab'.repeat(32)), 401, 'unauthorized')
  })

  it('413 on a Content-Length over 1 MiB, without reading the body', async () => {
    const r = await app.request(
      '/webhooks/alchemy',
      { method: 'POST', headers: { 'content-length': String(1024 * 1024 + 1) }, body: '{}' },
      R,
    )
    await answer(r, 413, 'invalid_request')
    expect(sqls).toEqual([])
  })
})

describe('other confusion', () => {
  it('415 when a JSON-RPC body is sent as text/plain, with no upstream call', async () => {
    const headers = { ...(await bearer()), 'content-type': 'text/plain' }
    const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] })
    await answer(await call('/v1/rpc', { method: 'POST', headers, body }), 415, 'invalid_request')
  })

  it('404 for the wrong method, a trailing slash, another case and a double slash', async () => {
    for (const [method, path] of [
      ['GET', '/v1/rpc'],
      ['POST', '/v1/health'],
      ['POST', '/v1/rpc/'],
      ['POST', '/V1/rpc'],
      ['POST', '/v1//rpc'],
    ] as const)
      await answer(await call(path, { method, headers: await bearer() }), 404, 'not_found')
  })
})
