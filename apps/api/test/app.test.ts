import { env } from 'cloudflare:workers'
import { ErrorEnvelope } from '@vaultme/contracts'
import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { app, handleError } from '../src/app.ts'

const get = (path: string, headers: Record<string, string> = {}, e = env) => app.request(path, { headers }, e)
const V = { 'X-App-Version': '1.0.0' }

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

  it('403 on Origin header, even for health', async () => {
    const r = await get('/v1/health', { Origin: 'https://evil.example' })
    expect(r.status).toBe(403)
    expect((await r.json()) as { code: string }).toMatchObject({ code: 'origin_forbidden' })
  })

  it('404 envelope for unknown route', async () => {
    const r = await get('/v1/nope', V)
    expect(r.status).toBe(404)
    expect(await r.json()).toEqual({ code: 'not_found', message: 'Not found', retryable: false })
  })

  it('500 envelope has no stack', async () => {
    const boom = new Hono()
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
