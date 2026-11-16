import * as Sentry from '@sentry/cloudflare'
import { createExecutionContext, createScheduledController, waitOnExecutionContext } from 'cloudflare:test'
import { env } from 'cloudflare:workers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../src/app.ts'
import { b64uEncode, issueToken, nowSeconds } from '../src/auth.ts'
import { getDb, withoutParams } from '../src/db/index.ts'
import { serverErrors } from '../src/db/schema.ts'
import type { Env } from '../src/env.ts'
import { handler } from '../src/index.ts'
import { sentryOptions } from '../src/sentry.ts'

const ADDR = '0x' + 'ab'.repeat(20)
const HASH = '0x' + '11'.repeat(32)
type Point = { indexes?: string[]; blobs?: string[]; doubles?: number[] }
let points: Point[]
const E = { ...env, ANALYTICS: { writeDataPoint: (p: Point) => void points.push(p) } as AnalyticsEngineDataset }
const V = { 'X-App-Version': '1.0.0' }
const open: RateLimit = { limit: () => Promise.resolve({ success: true }) }
const spyLog = () => vi.spyOn(console, 'log').mockImplementation(() => undefined)
const lines = (s: { mock: { calls: unknown[][] } }) =>
  s.mock.calls.map((c) => JSON.parse(String(c[0])) as Record<string, unknown>)
const errorRows = async () => (await E.DB.prepare('SELECT COUNT(*) AS n FROM server_errors').first<{ n: number }>())?.n

// The real Worker handlers inside the real Sentry wrapper with the production options. An event is read after beforeSend (the scrubber) and not sent.
let events: unknown[]
const worker: ExportedHandler<Env['Bindings']> = Sentry.withSentry(
  (e: Env['Bindings']) => {
    const o = sentryOptions(e)
    return {
      ...o,
      dsn: 'https://key@o1.ingest.sentry.io/2',
      beforeSend: async (event, hint) => {
        events.push(await o.beforeSend?.(event, hint))
        return null
      },
    }
  },
  // New functions: withSentry skips a function it already wrapped (the default export of src/index.ts wrapped these).
  { fetch: (...a) => handler.fetch(...a), scheduled: (c, e) => handler.scheduled(c, e) },
)
const call = async (path: string, e: typeof E = E) => {
  const ctx = createExecutionContext()
  const r = await worker.fetch!(new Request(`https://api.example${path}`, { headers: V }), e, ctx)
  await waitOnExecutionContext(ctx)
  return r
}
const cron = async (e: typeof E = E) => {
  const ctx = createExecutionContext()
  await worker.scheduled!(createScheduledController({ cron: '17 * * * *' }), e, ctx)
  await waitOnExecutionContext(ctx)
}

beforeEach(async () => {
  points = []
  events = []
  // Workaround: @sentry/cloudflare 11.9 keeps its client (so its `environment` and the last event it dedupes against) on this global for the life of the isolate.
  // Without a reset the result depends on test order and on repeats (--repeats, --sequence.shuffle). The SDK option `cacheClient: false` is not used: it changes the cached-client path that production runs. Remove when `_clearGlobalClientCache` is exported from the package.
  delete (globalThis as Record<string, unknown>).__SENTRY_CLOUDFLARE_CLIENT__
  await E.DB.prepare('DELETE FROM server_errors').run()
})
afterEach(() => vi.restoreAllMocks())

describe('request log and data point (Q56)', () => {
  it('logs one JSON line with a request id, route, status and duration, and writes a data point', async () => {
    const log = spyLog()
    expect((await app.request('/v1/health', {}, E)).status).toBe(200)
    expect(lines(log)).toEqual([
      expect.objectContaining({ level: 'info', event: 'request', method: 'GET', route: '/v1/health', status: 200 }),
    ])
    const line = lines(log)[0]!
    expect(typeof line.requestId).toBe('string')
    expect(typeof line.duration_ms).toBe('number')
    expect(points).toEqual([{ indexes: ['request'], blobs: ['/v1/health', '200'], doubles: [line.duration_ms] }])
  })

  it('gives each request its own id', async () => {
    const log = spyLog()
    await app.request('/v1/health', {}, E)
    await app.request('/v1/health', {}, E)
    const [a, b] = lines(log)
    expect(a?.requestId).not.toBe(b?.requestId)
  })

  it('names an unmatched path not_found and never logs the raw path', async () => {
    const log = spyLog()
    expect((await app.request(`/${ADDR}`, { headers: V }, E)).status).toBe(404)
    expect(lines(log)[0]).toMatchObject({ route: 'not_found', status: 404 })
    expect(points[0]?.blobs).toEqual(['not_found', '404'])
    expect(JSON.stringify([...lines(log), ...points])).not.toContain('abab')
  })

  it('writes the data point even when the Analytics Engine write throws', async () => {
    const bad = {
      ...E,
      ANALYTICS: {
        writeDataPoint: () => {
          throw new Error('x')
        },
      } as unknown as AnalyticsEngineDataset,
    }
    expect((await app.request('/v1/health', {}, bad)).status).toBe(200)
  })
})

describe('/v1/debug/sentry (Q50)', () => {
  it('throws in dev: 500, logged, sent to Sentry and counted as a 5xx', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const r = await call('/v1/debug/sentry', { ...E, ENVIRONMENT: 'dev' })
    expect(r.status).toBe(500)
    expect(events).toMatchObject([
      { exception: { values: [{ type: 'Error', value: 'vaultme sentry test' }] }, environment: 'dev' },
    ])
    expect(await errorRows()).toBe(1)
  })

  it.each(['staging', 'production'])('answers 404 in %s and throws nothing', async (environment) => {
    const r = await call('/v1/debug/sentry', { ...E, ENVIRONMENT: environment })
    expect(r.status).toBe(404)
    expect(events).toEqual([])
    expect(await errorRows()).toBe(0)
  })
})

const SERVER_ERROR_ALERT_COUNT = 10 // src/alerts.ts

describe('5xx spike alert (Q69)', () => {
  const insert = (n: number, at: number) =>
    E.DB.batch(Array.from({ length: n }, () => E.DB.prepare('INSERT INTO server_errors (at) VALUES (?)').bind(at)))

  it('sends nothing below the threshold, and ignores rows older than an hour', async () => {
    await insert(SERVER_ERROR_ALERT_COUNT - 1, nowSeconds())
    await insert(50, nowSeconds() - 3700)
    await cron()
    expect(events).toEqual([])
  })

  it('sends one error event with a stable fingerprint at the threshold, and purges rows older than a day', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await insert(SERVER_ERROR_ALERT_COUNT, nowSeconds())
    await insert(3, nowSeconds() - 2 * 24 * 3600)
    await cron()
    expect(events).toMatchObject([
      {
        message: 'API 5xx spike',
        level: 'error',
        fingerprint: ['alert', 'api-5xx-spike'],
        tags: { alert: 'api-5xx-spike' },
        extra: { count_last_hour: SERVER_ERROR_ALERT_COUNT },
      },
    ])
    expect(await errorRows()).toBe(SERVER_ERROR_ALERT_COUNT)
  })

  it('a 5xx that cannot be counted is logged and does not change the answer', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await E.DB.prepare('ALTER TABLE server_errors RENAME TO server_errors_off').run()
    try {
      expect((await app.request('/v1/debug/sentry', { headers: V }, E)).status).toBe(500)
    } finally {
      await E.DB.prepare('ALTER TABLE server_errors_off RENAME TO server_errors').run()
    }
    expect(lines(err)).toContainEqual(expect.objectContaining({ event: 'server_error_not_counted' }))
  })
})

describe('a failed drizzle query', () => {
  it('reaches Sentry and the logs without its bound values', async () => {
    await E.DB.prepare('ALTER TABLE server_errors RENAME TO server_errors_off').run()
    let error = new Error('not thrown')
    try {
      await getDb(E.DB).insert(serverErrors).values({ at: 424242424 })
    } catch (e) {
      error = e as Error
    } finally {
      await E.DB.prepare('ALTER TABLE server_errors_off RENAME TO server_errors').run()
    }
    expect(error.message).toContain('424242424') // drizzle puts the params in the message
    const sent = await sentryOptions(E).beforeSend?.({ exception: { values: [{ value: error.message }] } } as never, {})
    expect(JSON.stringify(sent)).toContain('Failed query')
    expect(JSON.stringify(sent)).not.toContain('424242424')
    expect(withoutParams(error.message)).not.toContain('424242424')
  })
})

describe('client errors and the cron', () => {
  it('a malformed JSON body is a 400, not a 5xx: no Sentry event, no server_errors row', async () => {
    const r = await app.request(
      '/v1/installs',
      { method: 'POST', headers: { ...V, 'content-type': 'application/json' }, body: '{not json' },
      // The 400 is the point, not the limit: the real IP limiter of E counts per IP, so repeats of this test would end in 429.
      { ...E, INSTALL_IP_LIMITER: open },
    )
    expect(r.status).toBe(400)
    expect(await r.json()).toMatchObject({ code: 'invalid_request' })
    expect(await errorRows()).toBe(0)
  })

  it('a failing alert check is logged and reported on its own; the run still ends', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await E.DB.prepare('ALTER TABLE server_errors RENAME TO server_errors_off').run()
    try {
      await cron() // the sweep works; only the alert check fails
    } finally {
      await E.DB.prepare('ALTER TABLE server_errors_off RENAME TO server_errors').run()
    }
    expect(lines(err)).toContainEqual(expect.objectContaining({ event: 'alert_check_failed' }))
    expect(events).toHaveLength(1) // the alert-check error, sent once
  })

  it('a failing sweep still runs the alert check, and its error is thrown (and reported by the Sentry wrapper)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await E.DB.batch(
      Array.from({ length: 10 }, () => E.DB.prepare('INSERT INTO server_errors (at) VALUES (?)').bind(nowSeconds())),
    )
    await E.DB.prepare('ALTER TABLE push_subscriptions RENAME TO push_subscriptions_off').run()
    try {
      await expect(cron()).rejects.toThrow()
    } finally {
      await E.DB.prepare('ALTER TABLE push_subscriptions_off RENAME TO push_subscriptions').run()
    }
    const kinds = events.map((e) => ((e as { message?: string }).message === 'API 5xx spike' ? 'alert' : 'sweep error'))
    expect(kinds.sort()).toEqual(['alert', 'sweep error'])
  })
})

describe('sentryOptions (Q50)', () => {
  const o = sentryOptions(E)

  it('uses the env name and no DSN when the var is empty', () => {
    expect(o.environment).toBe('dev')
    expect(sentryOptions({ ...E, SENTRY_DSN: '' }).dsn).toBeUndefined()
    expect(sentryOptions({ ...E, SENTRY_DSN: 'https://k@o1.ingest.sentry.io/2' }).dsn).toBe(
      'https://k@o1.ingest.sentry.io/2',
    )
  })

  it('collects no user, cookies, headers, bodies or query, and starts no tracing', () => {
    expect(o.dataCollection).toMatchObject({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    })
    expect(o.tracesSampleRate).toBeUndefined()
  })

  it('beforeSend scrubs an address and a hash out of the message, the exception and the request', async () => {
    const event = await o.beforeSend?.(
      {
        message: `failed for ${ADDR}`,
        exception: { values: [{ value: `tx ${HASH}` }] },
        request: {
          method: 'POST',
          url: `https://api.example/v1/history?a=${ADDR}`,
          data: { address: ADDR },
          headers: { a: 'b' },
        },
        user: { ip_address: '1.2.3.4' },
      } as never,
      {},
    )
    expect(JSON.stringify(event)).not.toMatch(/abab|1111|1\\.2\\.3\\.4/)
    expect(event).toMatchObject({ request: { method: 'POST', url: 'https://api.example/v1/history' } })
  })

  it('beforeBreadcrumb drops outgoing network breadcrumbs (their URLs carry API keys) and scrubs the rest', () => {
    expect(
      o.beforeBreadcrumb?.({ category: 'fetch', data: { url: 'https://sepolia.infura.io/v3/KEY' } }, undefined),
    ).toBeNull()
    expect(o.beforeBreadcrumb?.({ category: 'console', message: `sent ${HASH}` }, undefined)).toMatchObject({
      message: 'sent [hash]',
    })
  })
})

describe('alerts with a source (API-5)', () => {
  describe('stuck push_unregister rows (dead letters)', () => {
    const STUCK_SECONDS = 86_400
    const addRow = (address: string, createdAt: number) =>
      E.DB.prepare('INSERT INTO push_unregister (address, created_at) VALUES (?, ?)').bind(address, createdAt).run()
    // Alchemy cannot be reached, so the sweep's removal retry fails and the rows stay: that is what a dead letter is.
    const P = { ...E, ALCHEMY_NOTIFY_TOKEN: 'test-token', ALCHEMY_WEBHOOK_ID: 'test-webhook' }
    const stuckEvents = () => events.filter((e) => (e as { message?: string }).message === 'Push unregister stuck')
    beforeEach(async () => {
      await E.DB.prepare('DELETE FROM push_unregister').run()
      vi.stubGlobal('fetch', () => Promise.resolve(new Response('x', { status: 500 })))
    })
    afterEach(async () => {
      vi.unstubAllGlobals()
      await E.DB.prepare('DELETE FROM push_unregister').run()
    })

    it('sends nothing for rows younger than a day, or for none', async () => {
      const err = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      await cron(P).catch(() => undefined) // a failed Alchemy removal also fails the sweep: its own event, not the one under test
      await addRow('0x' + '01'.repeat(20), nowSeconds() - STUCK_SECONDS + 600)
      await cron(P).catch(() => undefined) // a failed Alchemy removal also fails the sweep: its own event, not the one under test
      expect(stuckEvents()).toEqual([])
      expect(lines(err).filter((l) => l.event === 'alert_check_failed')).toEqual([]) // the check itself ran
    })

    it('sends one event with a stable fingerprint for a row older than 86,400 s, with the count and age, never the address', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      await addRow('0x' + '02'.repeat(20), nowSeconds() - STUCK_SECONDS - 600)
      await addRow('0x' + '03'.repeat(20), nowSeconds() - STUCK_SECONDS - 7200)
      await addRow('0x' + '04'.repeat(20), nowSeconds() - 60)
      await cron(P).catch(() => undefined) // a failed Alchemy removal also fails the sweep: its own event, not the one under test
      expect(stuckEvents()).toMatchObject([
        {
          level: 'error',
          fingerprint: ['alert', 'push-unregister-stuck'],
          tags: { alert: 'push-unregister-stuck' },
          extra: { count: 2, oldest_age_seconds: expect.any(Number) as number },
        },
      ])
      expect(JSON.stringify(events)).not.toMatch(/0x(02|03|04){20}/)
    })

    it('does not hide the 5xx spike: both conditions report', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      await addRow('0x' + '05'.repeat(20), nowSeconds() - STUCK_SECONDS - 1)
      await E.DB.batch(
        Array.from({ length: 10 }, () => E.DB.prepare('INSERT INTO server_errors (at) VALUES (?)').bind(nowSeconds())),
      )
      await cron(P).catch(() => undefined) // a failed Alchemy removal also fails the sweep: its own event, not the one under test
      const messages = events.map((e) => (e as { message?: string }).message)
      expect(messages).toContain('API 5xx spike')
      expect(messages).toContain('Push unregister stuck')
    })
  })

  describe('first Infura daily-cap answer (402) per isolate per UTC day', () => {
    const rand = () => b64uEncode(crypto.getRandomValues(new Uint8Array(24)))
    const R = {
      ...E,
      TOKEN_SECRET: rand() + rand(),
      INFURA_KEY: rand(),
      ALCHEMY_KEY: rand(),
      RPC_IP_LIMITER: open,
      INSTALL_LIMITER: open,
    }
    const rpcCall = async () => {
      const token = (await issueToken({ env: R } as never, crypto.randomUUID())).token
      const ctx = createExecutionContext()
      const r = await worker.fetch!(
        new Request('https://api.example/v1/rpc', {
          method: 'POST',
          headers: { ...V, 'content-type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
        }),
        R,
        ctx,
      )
      await waitOnExecutionContext(ctx)
      return r
    }
    const upstream = (infura: () => Response) =>
      vi.stubGlobal('fetch', (input: string | URL) =>
        Promise.resolve(
          String(input).includes('infura')
            ? infura()
            : new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x1' })),
        ),
      )
    const cap = () =>
      new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          error: { code: 402, event: -33000, message: 'daily request count exceeded' },
        }),
        { status: 402 },
      )
    const alerts = () =>
      events.filter((e) => (e as { message?: string }).message?.startsWith('Infura daily cap reached ') === true)
    afterEach(() => {
      vi.useRealTimers()
      vi.unstubAllGlobals()
    })
    // `infuraDailyCap` keeps its day for the life of the isolate, so every case takes fresh UTC days (3 apart): a repeat run must not meet the day of the last one.
    let nextDay = Date.UTC(2031, 0, 1)
    const freshDay = () => (nextDay += 3 * 86_400_000)
    const H = 3_600_000

    it('one event for the first 402 of a UTC day; none for the next 402s that day; one again the next day; the user still gets the Alchemy answer', async () => {
      const err = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      vi.useFakeTimers({ toFake: ['Date'] })
      const d1 = freshDay()
      vi.setSystemTime(d1 + 10 * H)
      upstream(cap)
      const capLines = () => lines(err).filter((l) => l.event === 'alert_infura_daily_cap')
      expect((await rpcCall()).status).toBe(200)
      expect(alerts()).toMatchObject([
        {
          message: `Infura daily cap reached ${new Date(d1).toISOString().slice(0, 10)}`,
          level: 'error',
          fingerprint: ['alert', 'infura-402'],
          tags: { alert: 'infura-402' },
        },
      ])
      await rpcCall()
      vi.setSystemTime(d1 + 24 * H - 60_000)
      await rpcCall()
      expect(capLines()).toHaveLength(1) // the SDK's own dedupe would hide a second event: count the log line too
      expect(alerts()).toHaveLength(1)
      vi.setSystemTime(d1 + 24 * H + 60_000)
      await rpcCall()
      expect(capLines()).toHaveLength(2)
      expect(alerts()).toHaveLength(2)
    })

    it('a 402 body inside a 200 (daily cap event -33000) counts too; a throughput 429 does not', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(freshDay() + 10 * H)
      upstream(
        () =>
          new Response(
            JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: 429, event: -33200, message: 'throughput' } }),
            { status: 429 },
          ),
      )
      await rpcCall()
      expect(alerts()).toEqual([])
      vi.setSystemTime(freshDay() + 10 * H)
      upstream(
        () =>
          new Response(
            JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32000, event: -33000, message: 'cap' } }),
          ),
      )
      await rpcCall()
      expect(alerts()).toHaveLength(1)
    })

    it('the daily-cap event counts when the code is another quota code too: code -32005 with event -33000', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(freshDay() + 10 * H)
      upstream(
        () =>
          new Response(
            JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32005, event: -33000, message: 'cap' } }),
          ),
      )
      await rpcCall()
      expect(alerts()).toHaveLength(1)
    })

    it('no alert for an Infura 5xx, and none from Alchemy', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(freshDay() + 10 * H)
      upstream(() => new Response('x', { status: 502 }))
      await rpcCall()
      expect(alerts()).toEqual([])
    })

    it('a 402 from Alchemy, the backup, is no Infura alert', async () => {
      const err = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(freshDay() + 10 * H)
      vi.stubGlobal('fetch', (input: string | URL) =>
        Promise.resolve(
          new Response(JSON.stringify({ error: { code: 402 } }), {
            status: String(input).includes('infura') ? 502 : 402,
          }),
        ),
      )
      expect((await rpcCall()).status).toBe(503)
      expect(alerts()).toEqual([])
      expect(lines(err).filter((l) => l.event === 'alert_infura_daily_cap')).toEqual([])
    })
  })
})
