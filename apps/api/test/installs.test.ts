import { env } from 'cloudflare:workers'
import {
  CLOCK_SKEW_SECONDS,
  INSTALL_ID_HEADER,
  NONCE_HEADER,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  TOKEN_TTL_SECONDS,
  canonicalString,
} from '@vaultme/contracts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../src/app.ts'
import { b64uEncode } from '../src/auth.ts'

const open: RateLimit = { limit: () => Promise.resolve({ success: true }) }
const closed: RateLimit = { limit: () => Promise.resolve({ success: false }) }
// Fresh secret per run, never a hard-coded one.
const secret = b64uEncode(crypto.getRandomValues(new Uint8Array(48)))
const E = { ...env, TOKEN_SECRET: secret, INSTALL_IP_LIMITER: open, INSTALL_LIMITER: open }
const V = { 'X-App-Version': '1.0.0' }

const call = (path: string, init: RequestInit = {}, e: typeof E = E) =>
  app.request(path, { ...init, headers: { ...V, ...(init.headers as Record<string, string>) } }, e)

const genKey = async () =>
  (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair
const rawPublic = async (k: CryptoKeyPair) =>
  b64uEncode(new Uint8Array((await crypto.subtle.exportKey('raw', k.publicKey)) as ArrayBuffer))

const sha256Hex = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

// Mimics the mobile client: generate a device key, register, sign requests.
async function newDevice(e: typeof E = E) {
  const pair = await genKey()
  const publicKey = await rawPublic(pair)
  const r = await call('/v1/installs', json({ publicKey }), e)
  const { installId } = await r.json<{ installId: string }>()
  const sign = async (
    method: string,
    path: string,
    body = '',
    o: { ts?: number; nonce?: string; key?: CryptoKey } = {},
  ) => {
    const ts = o.ts ?? Math.floor(Date.now() / 1000)
    const nonce = o.nonce ?? b64uEncode(crypto.getRandomValues(new Uint8Array(16)))
    const canonical = canonicalString({ method, path, installId, ts, nonce, bodySha256Hex: await sha256Hex(body) })
    const sig = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      o.key ?? pair.privateKey,
      new TextEncoder().encode(canonical),
    )
    return {
      [INSTALL_ID_HEADER]: installId,
      [TIMESTAMP_HEADER]: String(ts),
      [NONCE_HEADER]: nonce,
      [SIGNATURE_HEADER]: b64uEncode(new Uint8Array(sig)),
    }
  }
  const token = async () => {
    const r = await call('/v1/installs/token', { method: 'POST', headers: await sign('POST', '/v1/installs/token') }, e)
    return { r, body: await r.json<{ token: string; expiresAt: number }>() }
  }
  return { installId, publicKey, sign, token }
}
const json = (b: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(b),
})
const code = async (r: Response) => (await r.json<{ code: string }>()).code

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }))
afterEach(() => vi.useRealTimers())

describe('installs', () => {
  it('registers a device key and issues a token that opens a protected route', async () => {
    const d = await newDevice()
    expect(d.installId).toMatch(/^[0-9a-f-]{36}$/)
    const { r, body } = await d.token()
    expect(r.status).toBe(200)
    expect(body.expiresAt - Math.floor(Date.now() / 1000)).toBe(TOKEN_TTL_SECONDS)
    const me = await call('/v1/installs/me', { headers: { Authorization: `Bearer ${body.token}` } })
    expect(me.status).toBe(200)
    expect(await me.json()).toEqual({ installId: d.installId })
  })

  it('rejects a malformed public key', async () => {
    const r = await call('/v1/installs', json({ publicKey: 'A'.repeat(87) }))
    expect(r.status).toBe(400)
  })

  it('rejects a signature from another key', async () => {
    const d = await newDevice()
    const other = await genKey()
    const headers = await d.sign('POST', '/v1/installs/token', '', { key: other.privateKey })
    const r = await call('/v1/installs/token', { method: 'POST', headers })
    expect(r.status).toBe(401)
    expect(await code(r)).toBe('signature_invalid')
  })

  it('rejects a signature made for another path', async () => {
    const d = await newDevice()
    const headers = await d.sign('POST', '/v1/rpc')
    const r = await call('/v1/installs/token', { method: 'POST', headers })
    expect(await code(r)).toBe('signature_invalid')
  })

  it('rejects a replayed nonce', async () => {
    const d = await newDevice()
    const headers = await d.sign('POST', '/v1/installs/token')
    expect((await call('/v1/installs/token', { method: 'POST', headers })).status).toBe(200)
    const again = await call('/v1/installs/token', { method: 'POST', headers })
    expect(again.status).toBe(401)
    expect(await code(again)).toBe('nonce_reused')
  })

  it('accepts a nonce again after it has expired', async () => {
    const d = await newDevice()
    const nonce = b64uEncode(crypto.getRandomValues(new Uint8Array(16)))
    const t0 = Date.now()
    const first = await d.sign('POST', '/v1/installs/token', '', { nonce })
    expect((await call('/v1/installs/token', { method: 'POST', headers: first })).status).toBe(200)
    vi.setSystemTime(t0 + (2 * CLOCK_SKEW_SECONDS + 1) * 1000)
    const second = await d.sign('POST', '/v1/installs/token', '', { nonce })
    expect((await call('/v1/installs/token', { method: 'POST', headers: second })).status).toBe(200)
  })

  it.each([-1, 1])('rejects a timestamp outside the skew window (%i)', async (dir) => {
    const d = await newDevice()
    const ts = Math.floor(Date.now() / 1000) + dir * (CLOCK_SKEW_SECONDS + 5)
    const r = await call('/v1/installs/token', {
      method: 'POST',
      headers: await d.sign('POST', '/v1/installs/token', '', { ts }),
    })
    expect(r.status).toBe(401)
    expect(await code(r)).toBe('clock_skew')
  })

  it('rejects missing headers and unknown installs', async () => {
    const r = await call('/v1/installs/token', { method: 'POST' })
    expect(await code(r)).toBe('unauthorized')
    const d = await newDevice()
    const headers = { ...(await d.sign('POST', '/v1/installs/token')), [INSTALL_ID_HEADER]: crypto.randomUUID() }
    expect(await code(await call('/v1/installs/token', { method: 'POST', headers }))).toBe('unauthorized')
  })

  it('issues no token when the cron purged the install after the signature check', async () => {
    const d = await newDevice()
    const headers = await d.sign('POST', '/v1/installs/token')
    const racing = {
      ...E,
      DB: new Proxy(E.DB, {
        get: (t, k) =>
          k === 'prepare'
            ? (q: string) => {
                const st = t.prepare(q)
                return q.startsWith('UPDATE installs SET last_seen_at')
                  ? new Proxy(st, {
                      get: (s, m) =>
                        m === 'bind'
                          ? (...v: unknown[]) => {
                              const b = s.bind(...v)
                              return new Proxy(b, {
                                get: (x, y) =>
                                  y === 'run'
                                    ? async () => {
                                        await t.prepare('DELETE FROM installs WHERE id = ?').bind(d.installId).run()
                                        return x.run()
                                      }
                                    : (x as never)[y],
                              })
                            }
                          : (s as never)[m],
                    })
                  : st
              }
            : (t as never)[k],
      }),
    }
    const r = await call('/v1/installs/token', { method: 'POST', headers }, racing)
    expect(r.status).toBe(401)
    expect(await code(r)).toBe('unauthorized')
  })

  it('rejects an expired token', async () => {
    const d = await newDevice()
    const { body } = await d.token()
    vi.setSystemTime(Date.now() + (TOKEN_TTL_SECONDS + 1) * 1000)
    const r = await call('/v1/installs/me', { headers: { Authorization: `Bearer ${body.token}` } })
    expect(r.status).toBe(401)
    expect(await code(r)).toBe('unauthorized')
  })

  it('rejects a tampered or missing token', async () => {
    const d = await newDevice()
    const { body } = await d.token()
    const forged = `${crypto.randomUUID()}.${body.token.split('.').slice(1).join('.')}`
    for (const auth of [`Bearer ${forged}`, 'Bearer nope', `Bearer ${d.installId}.1.abcde`, undefined]) {
      const r = await call('/v1/installs/me', auth ? { headers: { Authorization: auth } } : {})
      expect(r.status).toBe(401)
    }
  })

  it('fails closed when TOKEN_SECRET is missing', async () => {
    const d = await newDevice()
    const r = await call(
      '/v1/installs/token',
      { method: 'POST', headers: await d.sign('POST', '/v1/installs/token') },
      { ...E, TOKEN_SECRET: '' },
    )
    expect(r.status).toBe(500)
  })

  it('429 with Retry-After from the install limiter', async () => {
    const d = await newDevice()
    const { body } = await d.token()
    const r = await call(
      '/v1/installs/me',
      { headers: { Authorization: `Bearer ${body.token}` } },
      { ...E, INSTALL_LIMITER: closed },
    )
    expect(r.status).toBe(429)
    expect(r.headers.get('Retry-After')).toBe('60')
    expect(await r.json()).toEqual({ code: 'rate_limited', message: 'Too many requests', retryable: true })
  })

  it('429 on the 4th registration per minute (real binding)', async () => {
    const real = { ...E, INSTALL_IP_LIMITER: env.INSTALL_IP_LIMITER }
    const statuses: number[] = []
    for (let i = 0; i < 4; i++) {
      const publicKey = await rawPublic(await genKey())
      const r = await call(
        '/v1/installs',
        { ...json({ publicKey }), headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '203.0.113.7' } },
        real,
      )
      statuses.push(r.status)
      if (r.status === 429) expect(r.headers.get('Retry-After')).toBe('60')
    }
    expect(statuses).toEqual([201, 201, 201, 429])
    // The IP limiter covers registration only, not the other /v1/installs/* routes.
    const d = await newDevice()
    const r = await call(
      '/v1/installs/token',
      { method: 'POST', headers: await d.sign('POST', '/v1/installs/token') },
      real,
    )
    expect(r.status).toBe(200)
  })
})
