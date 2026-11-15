import { env } from 'cloudflare:workers'
import { ErrorEnvelope } from '@vaultme/contracts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../src/app.ts'
import { b64uEncode, issueToken, nowSeconds } from '../src/auth.ts'

// FI-1: one table for every upstream x every fault class. Each cell runs the real route against a faulty upstream (fakes only, no quota) and checks:
//   1. the documented status: 200 through the fallback, or 503 `unavailable` (retryable); never 500 for an upstream fault. D1 is not an upstream
//      we can route around: a D1 failure is a 500 `internal` envelope (and Alchemy retries the webhook), but `/v1/rpc` does not use D1 at all;
//   2. the calls the fault caused are bounded: RPC 1 call per upstream, a send never in parallel, Etherscan 1 call per list (2 only after its rate-limit
//      text, so at most 6 per history miss), Expo 1 per batch. This is the "no retry storm" proof: clients never retry by themselves (`retry: false`);
//   3. no key, token, address, hash or install key reaches the body or a log line (every fault text carries the upstream's secret).
// 5 upstreams x 6 faults + a JSON-RPC error in a 200 for Infura and Alchemy = 32 cells. The typed tables below make a missing cell a compile error,
// and the last test counts them.

const open: RateLimit = { limit: () => Promise.resolve({ success: true }) }
const rand = () => b64uEncode(crypto.getRandomValues(new Uint8Array(24)))
const grant = (wait: number | null) =>
  ({ getByName: () => ({ acquire: () => Promise.resolve(wait) }) }) as unknown as typeof env.ETHERSCAN_BUCKET
const SECRET = {
  INFURA_KEY: rand(),
  ALCHEMY_KEY: rand(),
  ETHERSCAN_API_KEY: rand(),
  EXPO_ACCESS_TOKEN: rand(),
  ALCHEMY_NOTIFY_TOKEN: rand(),
  ALCHEMY_SIGNING_KEY: rand(),
  TOKEN_SECRET: rand() + rand(),
}
const E = {
  ...env,
  ...SECRET,
  ALCHEMY_WEBHOOK_ID: 'wh_test',
  INSTALL_LIMITER: open,
  INSTALL_IP_LIMITER: open,
  RPC_IP_LIMITER: open,
  HISTORY_IP_LIMITER: open,
  ETHERSCAN_BUCKET: grant(0),
}
const ADDR = '0x' + 'ab'.repeat(20)
const OTHER = '0x' + 'cd'.repeat(20)
const NOBODY = '0x' + 'ee'.repeat(20)
const HASH = '0x' + '11'.repeat(32)
const PUSH_TOKEN = 'ExponentPushToken[abcdefghijklmnop]'

const UPSTREAMS = ['infura', 'alchemy', 'etherscan', 'expo', 'd1'] as const
const FAULTS = ['5xx', '429', 'timeout', 'bad body', 'slow', 'network'] as const
type Upstream = (typeof UPSTREAMS)[number]
type Fault = (typeof FAULTS)[number]
type Net = 'infura' | 'alchemy' | 'etherscan' | 'expo'
const HOSTS: Record<string, Net> = {
  'sepolia.infura.io': 'infura',
  'eth-sepolia.g.alchemy.com': 'alchemy',
  'api.etherscan.io': 'etherscan',
  'exp.host': 'expo',
}
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const SLOW_MS = 150 // above the 60 ms hedge, far under every upstream timeout

// ---- the fake network ----
type Behavior = (init: RequestInit | undefined, url: URL) => Response | Promise<Response>
type Call = { up: Net; url: URL; init: RequestInit | undefined }
let calls: Call[]
let maxActive: number // the most calls in flight at once
let out: string[] // every console line of the test
let stray: string[] // hosts of fetches no behavior was set for: the app may swallow that throw, so the test checks it
let addresses: string[] // every address a test sent: none may reach a log or a body
const count = (up: Net) => calls.filter((c) => c.up === up).length
const perAction = (up: Net) => {
  const m = new Map<string, number>()
  for (const c of calls.filter((x) => x.up === up)) {
    const a = c.url.searchParams.get('action') ?? '?'
    m.set(a, (m.get(a) ?? 0) + 1)
  }
  return m
}
/** Routes `fetch` by host to a behavior. A host with no behavior is a failed test, not a real request. */
const route = (behave: Partial<Record<Net, Behavior>>) => {
  calls = []
  maxActive = 0
  let active = 0
  vi.stubGlobal('fetch', async (input: string | URL, init?: RequestInit) => {
    const url = new URL(input)
    const up = HOSTS[url.hostname]
    const b = up === undefined ? undefined : behave[up]
    if (up === undefined || b === undefined) {
      stray.push(url.hostname)
      throw new Error('unexpected fetch')
    }
    calls.push({ up, url, init })
    maxActive = Math.max(maxActive, ++active)
    try {
      return await b(init, url)
    } finally {
      active--
    }
  })
}
beforeEach(async () => {
  calls = []
  maxActive = 0
  out = []
  stray = []
  addresses = []
  for (const m of ['log', 'warn', 'error'] as const)
    vi.spyOn(console, m).mockImplementation((...a) => void out.push(a.join(' ')))
  for (const t of ['push_sent', 'push_subscriptions', 'installs']) await E.DB.prepare(`DELETE FROM ${t}`).run()
})
afterEach(() => {
  expect(stray).toEqual([])
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** What an upstream does under `fault`. Every failure text carries `secret`: an implementation that passes upstream text on would leak it. */
const under = (fault: Fault, secret: string, good: () => Response): Behavior => {
  switch (fault) {
    case '5xx':
      return () => new Response(`boom ${secret}`, { status: 502 })
    case '429':
      return () => new Response(`slow down ${secret}`, { status: 429 })
    case 'timeout':
      return () => Promise.reject(new DOMException(`timed out ${secret}`, 'TimeoutError'))
    case 'bad body':
      return () => new Response(`<html>${secret}</html>`)
    case 'slow':
      return async () => {
        await sleep(SLOW_MS)
        return good()
      }
    case 'network':
      return () => Promise.reject(new TypeError(`fetch failed ${secret}`))
  }
}

// ---- requests ----
const auth = async () => ({
  Authorization: `Bearer ${(await issueToken({ env: E } as never, crypto.randomUUID())).token}`,
  'X-App-Version': '1.0.0',
})
const post = async (path: string, body: unknown, e: typeof E = E) =>
  app.request(
    path,
    { method: 'POST', headers: { ...(await auth()), 'content-type': 'application/json' }, body: JSON.stringify(body) },
    e,
  )
const rpc = (method = 'eth_blockNumber', params: unknown[] = []) =>
  post('/v1/rpc', { jsonrpc: '2.0', id: 7, method, params })
const rpcOk = (result: unknown = '0x1') => new Response(JSON.stringify({ jsonrpc: '2.0', id: 7, result }))
const rpcErr = (code: number) =>
  new Response(JSON.stringify({ jsonrpc: '2.0', id: 7, error: { code, message: `error ${String(code)}` } }))
const newAddress = () => {
  const a = '0x' + [...crypto.getRandomValues(new Uint8Array(20))].map((x) => x.toString(16).padStart(2, '0')).join('')
  addresses.push(a)
  return a
}
const noTransactions = () => Response.json({ status: '0', message: 'No transactions found', result: [] })
const history = (address: string) => post('/v1/history', { address })

const sign = async (raw: string) => {
  const k = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SECRET.ALCHEMY_SIGNING_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(raw)))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
/** An incoming ETH transfer to `to`, as Alchemy Notify sends it. */
const hook = async (to: string, e: typeof E = E) => {
  const raw = JSON.stringify({
    webhookId: 'wh_test',
    id: 'whevt_1',
    type: 'ADDRESS_ACTIVITY',
    event: {
      network: 'ETH_SEPOLIA',
      activity: [
        {
          hash: HASH,
          fromAddress: OTHER,
          toAddress: to,
          value: 0.5,
          asset: 'ETH',
          category: 'external',
          rawContract: { rawValue: '0x6f05b59d3b20000', decimals: 18 },
          blockNum: '0x10',
        },
      ],
    },
  })
  return app.request(
    '/webhooks/alchemy',
    {
      method: 'POST',
      headers: { 'X-Alchemy-Signature': await sign(raw), 'content-type': 'application/json' },
      body: raw,
    },
    e,
  )
}
/** An install that listens for ADDR with a push token, written to the real D1. */
const subscribed = async () => {
  const id = crypto.randomUUID()
  const now = nowSeconds()
  await E.DB.prepare('INSERT INTO installs (id, public_key, created_at, last_seen_at) VALUES (?, ?, ?, ?)')
    .bind(id, 'k', now, now)
    .run()
  await E.DB.prepare(
    'INSERT INTO push_subscriptions (install_id, address, expo_token, locale, created_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(id, ADDR, PUSH_TOKEN, 'en', now)
    .run()
}
const claims = async () => (await E.DB.prepare('SELECT COUNT(*) AS n FROM push_sent').first<{ n: number }>())?.n
/** Node answers for the push path: a successful receipt, and the block time that Q26 reads after a push. */
const chain: Behavior = (init) => {
  const { method } = JSON.parse(init?.body as string) as { method: string }
  return rpcOk(
    method === 'eth_getBlockByNumber' ? { timestamp: `0x${(nowSeconds() - 20).toString(16)}` } : { status: '0x1' },
  )
}
const tickets = () => Response.json({ data: [{ status: 'ok', id: 'r1' }] })

// ---- D1 ----
/** D1 under `fault`: every statement fails the same way (slow: late, then the real answer). `batch` hands the real statements to the binding. */
const flakyD1 = (db: D1Database, fault: Fault): D1Database => {
  const real = new WeakMap<object, D1PreparedStatement>()
  const hit = async (run: () => Promise<unknown>): Promise<unknown> => {
    switch (fault) {
      case '5xx':
        throw new Error('D1_ERROR: internal error')
      case '429':
        throw new Error('D1_ERROR: D1 DB is overloaded. Requests queued for too long.')
      case 'timeout':
        throw new DOMException('timed out', 'TimeoutError')
      case 'network':
        throw new Error('D1_ERROR: Network connection lost')
      case 'bad body':
        return {} // a result with no `results` and no `meta`
      case 'slow':
        await sleep(100)
        return run()
    }
  }
  const wrap = (stmt: D1PreparedStatement): D1PreparedStatement => {
    const w = new Proxy(stmt, {
      get: (t, p) => {
        if (p === 'bind') return (...a: unknown[]) => wrap(t.bind(...a))
        if (p === 'run') return () => hit(() => t.run())
        if (p === 'all') return () => hit(() => t.all())
        if (p === 'first') return () => hit(() => t.first())
        if (p === 'raw') return () => hit(() => t.raw())
        return Reflect.get(t, p) as unknown
      },
    })
    real.set(w, stmt)
    return w
  }
  return new Proxy(db, {
    get: (t, p) => {
      if (p === 'prepare') return (q: string) => wrap(t.prepare(q))
      if (p === 'batch') return (s: D1PreparedStatement[]) => hit(() => t.batch(s.map((x) => real.get(x) ?? x)))
      return Reflect.get(t, p) as unknown
    },
  })
}

// ---- the matrix ----
type Want = { status: 200 | 500 | 503; calls: Partial<Record<Net, number>> }
const row = (fails: Want, slow: Want = fails): Record<Fault, Want> => ({
  '5xx': fails,
  '429': fails,
  timeout: fails,
  'bad body': fails,
  slow,
  network: fails,
})
const answered = { status: 200, calls: {} } satisfies Want
const unavailable = { status: 503 } as const
const WANT: Record<Upstream, Record<Fault, Want>> = {
  // Infura fails or is slow: one fallback call to Alchemy (a slow read is hedged after 60 ms), the user gets an answer.
  infura: row({ status: 200, calls: { infura: 1, alchemy: 1 } }),
  // Infura is down and Alchemy, the fallback, is faulty: 503. A slow Alchemy still answers.
  alchemy: row({ ...unavailable, calls: { infura: 1, alchemy: 1 } }, { status: 200, calls: { infura: 1, alchemy: 1 } }),
  // All 3 lists fail together: 3 calls, no retry (the rate-limit text, which retries once, is its own case below).
  etherscan: row({ ...unavailable, calls: { etherscan: 3 } }, { status: 200, calls: { etherscan: 3 } }),
  // The webhook answers 503 so Alchemy retries; the claim is released; Expo got one batch.
  expo: row({ ...unavailable, calls: { expo: 1 } }, { status: 200, calls: { expo: 1 } }),
  // The webhook reads D1 first: no D1 means a 500 `internal` envelope (which Alchemy retries); a slow D1 only delays.
  d1: row({ status: 500, calls: {} }, answered),
}

/** Runs the route of `up` with `fault` injected; the other side is healthy. */
const RUN: Record<Upstream, (fault: Fault) => Promise<Response>> = {
  infura: (fault) => {
    route({ infura: under(fault, SECRET.INFURA_KEY, () => rpcOk('0x1')), alchemy: () => rpcOk('0x2') })
    return rpc()
  },
  alchemy: (fault) => {
    route({
      infura: under('5xx', SECRET.INFURA_KEY, rpcOk),
      alchemy: under(fault, SECRET.ALCHEMY_KEY, () => rpcOk('0x2')),
    })
    return rpc()
  },
  etherscan: (fault) => {
    route({ etherscan: under(fault, SECRET.ETHERSCAN_API_KEY, noTransactions) })
    return history(newAddress())
  },
  expo: async (fault) => {
    await subscribed()
    route({ infura: chain, expo: under(fault, SECRET.EXPO_ACCESS_TOKEN, tickets) })
    const res = await hook(ADDR)
    expect(await claims()).toBe(res.status === 200 ? 1 : 0) // a failed send releases its claim, so Alchemy's retry can send
    return res
  },
  d1: (fault) => {
    route({})
    return hook(NOBODY, { ...E, DB: flakyD1(E.DB, fault) })
  },
}

const cells = UPSTREAMS.flatMap((up) => FAULTS.map((fault) => [up, fault] as const))
const secrets = () => [...Object.values(SECRET), PUSH_TOKEN, ADDR, HASH, ...addresses]
const leaks = (text: string) => {
  const all = [text, ...out].join('\n')
  for (const s of secrets()) expect(all).not.toContain(s)
}
const expectEnvelope = (text: string, code: 'unavailable' | 'internal') =>
  expect(ErrorEnvelope.parse(JSON.parse(text))).toMatchObject({ code, retryable: code === 'unavailable' })

describe('fault matrix: upstream x fault', () => {
  it.each(cells)('%s x %s', async (up, fault) => {
    const want = WANT[up][fault]
    const res = await RUN[up](fault)
    const text = await res.text()
    expect(res.status).toBe(want.status)
    if (want.status === 503) expectEnvelope(text, 'unavailable')
    if (want.status === 500) expectEnvelope(text, 'internal')
    for (const [net, n] of Object.entries(want.calls)) expect(count(net as Net)).toBe(n)
    leaks(text)
  })
})

// The 2 JSON-RPC cells: a node error is an answer, a quota error is a failure. Each key is one cell; the completeness test counts them.
const RPC_ERROR_CELLS = {
  // Infura: a node error is the answer (one call); a quota error falls back.
  infura: async () => {
    route({ infura: () => rpcErr(-32000), alchemy: () => rpcOk('0x2') })
    const node = await rpc()
    const nodeText = await node.text()
    expect(node.status).toBe(200)
    expect(JSON.parse(nodeText)).toMatchObject({ error: { code: -32000 } })
    expect([count('infura'), count('alchemy')]).toEqual([1, 0])

    route({ infura: () => rpcErr(429), alchemy: () => rpcOk('0x2') })
    const quota = await rpc()
    const quotaText = await quota.text()
    expect(JSON.parse(quotaText)).toMatchObject({ result: '0x2' })
    expect([count('infura'), count('alchemy')]).toEqual([1, 1])
    leaks(nodeText + quotaText)
  },
  // Alchemy: used only when Infura fails; a quota error from it is a 503.
  alchemy: async () => {
    route({ infura: under('5xx', SECRET.INFURA_KEY, rpcOk), alchemy: () => rpcErr(-32000) })
    const node = await rpc()
    const nodeText = await node.text()
    expect(node.status).toBe(200)
    expect(JSON.parse(nodeText)).toMatchObject({ error: { code: -32000 } })
    expect([count('infura'), count('alchemy')]).toEqual([1, 1])

    route({ infura: under('5xx', SECRET.INFURA_KEY, rpcOk), alchemy: () => rpcErr(429) })
    const quota = await rpc()
    const quotaText = await quota.text()
    expect(quota.status).toBe(503)
    expectEnvelope(quotaText, 'unavailable')
    expect([count('infura'), count('alchemy')]).toEqual([1, 1])
    leaks(nodeText + quotaText)
  },
} satisfies Record<'infura' | 'alchemy', () => Promise<void>>

describe('fault matrix: a JSON-RPC error in a 200', () => {
  it.each(Object.entries(RPC_ERROR_CELLS))('%s x JSON-RPC error', async (_up, run) => {
    await run()
  })
})

// More on the same faults. They are not cells of the table above; each one pins a bound or a path the cells do not reach.
describe('retry bounds and other paths', () => {
  it.each(FAULTS)(
    'hedge side: a slow Infura answers, Alchemy has the fault %s: 2 calls, the Infura answer',
    async (fault) => {
      route({
        infura: async () => {
          await sleep(120)
          return rpcOk('0x1')
        },
        alchemy: under(fault, SECRET.ALCHEMY_KEY, () => rpcOk('0x2')),
      })
      const res = await rpc()
      const text = await res.text()
      expect(res.status).toBe(200)
      expect(JSON.parse(text)).toMatchObject({ result: '0x1' })
      expect([count('infura'), count('alchemy')]).toEqual([1, 1])
      leaks(text)
    },
  )

  it.each(FAULTS)('a send is never parallel: Infura has the fault %s', async (fault) => {
    route({ infura: under(fault, SECRET.INFURA_KEY, () => rpcOk('0xhash')), alchemy: () => rpcOk('0xhash') })
    const res = await rpc('eth_sendRawTransaction', ['0x02'])
    const text = await res.text()
    expect(res.status).toBe(200)
    expect(JSON.parse(text)).toMatchObject({ result: '0xhash' })
    // a slow Infura is not hedged (it answers); every other fault ends before Alchemy starts
    expect([count('infura'), count('alchemy')]).toEqual(fault === 'slow' ? [1, 0] : [1, 1])
    expect(maxActive).toBe(1)
    leaks(text)
  })

  it.each(FAULTS)('POST /v1/tx/internal, Etherscan fault %s: one list, one call', async (fault) => {
    route({ etherscan: under(fault, SECRET.ETHERSCAN_API_KEY, noTransactions) })
    const res = await post('/v1/tx/internal', { hash: HASH })
    const text = await res.text()
    expect(res.status).toBe(fault === 'slow' ? 200 : 503)
    if (fault !== 'slow') expectEnvelope(text, 'unavailable')
    expect(count('etherscan')).toBe(1)
    leaks(text)
  })

  it('Etherscan rate-limit text on every list: each list is asked at most twice, at most 6 calls, then 503', async () => {
    route({
      etherscan: () =>
        Response.json({ status: '0', message: 'NOTOK', result: 'Max calls per sec rate limit reached (3/sec)' }),
    })
    const res = await history(newAddress())
    expectEnvelope(await res.text(), 'unavailable')
    expect(res.status).toBe(503)
    expect([...perAction('etherscan').values()]).toEqual([2, 2, 2])
    expect(count('etherscan')).toBe(6)
  })

  it.each(FAULTS)('D1 fault %s: /v1/rpc still answers, /v1/installs fails closed', async (fault) => {
    route({ infura: () => rpcOk('0x1') })
    const down = { ...E, DB: flakyD1(E.DB, fault) }
    const viaRpc = await post('/v1/rpc', { jsonrpc: '2.0', id: 7, method: 'eth_blockNumber', params: [] }, down)
    expect(viaRpc.status).toBe(200) // the token is an HMAC: no D1 on this path
    const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ])) as CryptoKeyPair
    const publicKey = b64uEncode(new Uint8Array((await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer))
    const res = await app.request(
      '/v1/installs',
      {
        method: 'POST',
        headers: { 'X-App-Version': '1.0.0', 'content-type': 'application/json' },
        body: JSON.stringify({ publicKey }),
      },
      down,
    )
    const text = await res.text()
    // A write's result is never read, so a result of the wrong shape cannot be told from a good one (and D1 does not send one).
    if (fault === 'slow' || fault === 'bad body') expect(res.status).toBe(201)
    else {
      expect(res.status).toBe(500)
      expectEnvelope(text, 'internal')
    }
    expect(text).not.toContain(publicKey)
    expect(out.join('\n')).not.toContain(publicKey)
  })
})

describe('completeness', () => {
  it('has 32 cells: 5 upstreams x 6 faults and the 2 JSON-RPC error cells', () => {
    expect(Object.keys(WANT).sort()).toEqual([...UPSTREAMS].sort())
    for (const up of UPSTREAMS) expect(Object.keys(WANT[up]).sort()).toEqual([...FAULTS].sort())
    expect(cells).toHaveLength(30)
    expect(new Set(cells.map((c) => c.join(' x '))).size).toBe(30)
    expect(Object.keys(RPC_ERROR_CELLS).sort()).toEqual(['alchemy', 'infura'])
    expect(cells.length + Object.keys(RPC_ERROR_CELLS).length).toBe(32)
  })
})
