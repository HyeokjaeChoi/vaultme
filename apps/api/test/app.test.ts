import { env } from 'cloudflare:workers'
import { ErrorEnvelope } from '@vaultme/contracts'
import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { app, handleError } from '../src/app.ts'
import type { Env } from '../src/env.ts'

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
