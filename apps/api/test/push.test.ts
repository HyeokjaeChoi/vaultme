import { env } from 'cloudflare:workers'
import { USDC_SEPOLIA } from '@vaultme/contracts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../src/app.ts'
import { b64uEncode, issueToken, nowSeconds } from '../src/auth.ts'
import { PUSH_INACTIVE_SECONDS, sweep } from '../src/push.ts'

const INSTALL_KEEP_SECONDS = 90 * 24 * 3600
const open: RateLimit = { limit: () => Promise.resolve({ success: true }) }
const rand = () => b64uEncode(crypto.getRandomValues(new Uint8Array(24)))
type Point = { indexes?: string[]; blobs?: string[]; doubles?: number[] }
let points: Point[] // Analytics Engine data points written during a test
const E = {
  ...env,
  ANALYTICS: { writeDataPoint: (p: Point) => void points.push(p) } as AnalyticsEngineDataset,
  TOKEN_SECRET: rand() + rand(),
  INSTALL_LIMITER: open,
  INSTALL_IP_LIMITER: open,
  ALCHEMY_WEBHOOK_ID: 'wh_test',
  ALCHEMY_SIGNING_KEY: rand(),
  ALCHEMY_NOTIFY_TOKEN: rand(),
  EXPO_ACCESS_TOKEN: rand(),
  INFURA_KEY: rand(),
  ALCHEMY_KEY: rand(),
}
const ADDR = '0x' + 'ab'.repeat(20)
const OTHER = '0x' + 'cd'.repeat(20)
const HASH = '0x' + '11'.repeat(32)
const TOKEN = 'ExponentPushToken[abcdefghijklmnop]'
const addrPatch = 'https://dashboard.alchemy.com/api/update-webhook-addresses'
const expoSend = 'https://exp.host/--/api/v2/push/send'
const expoReceipts = 'https://exp.host/--/api/v2/push/getReceipts'
const PUSH_RECEIPT_DELAY_SECONDS = 15 * 60 // Expo: read receipts 15 minutes after the send
/** The JSON lines a console spy received. */
const logged = (spy: { mock: { calls: unknown[][] } }) =>
  spy.mock.calls.map((c) => JSON.parse(String(c[0])) as Record<string, unknown>)
const rpcUrl = (u: string) => u.startsWith('https://sepolia.infura.io/')

const newInstall = async (lastSeen = nowSeconds()) => {
  const id = crypto.randomUUID()
  await E.DB.prepare('INSERT INTO installs (id, public_key, created_at, last_seen_at) VALUES (?, ?, ?, ?)')
    .bind(id, 'k', lastSeen, lastSeen)
    .run()
  return id
}
const auth = async (id: string) => ({
  Authorization: `Bearer ${(await issueToken({ env: E } as never, id)).token}`,
  'X-App-Version': '1.0.0',
})
const put = async (id: string, body: unknown) =>
  app.request(
    '/v1/push/subscription',
    { method: 'PUT', headers: { ...(await auth(id)), 'content-type': 'application/json' }, body: JSON.stringify(body) },
    E,
  )
const del = async (id: string) => app.request('/v1/push/subscription', { method: 'DELETE', headers: await auth(id) }, E)
const subs = async () =>
  (await E.DB.prepare('SELECT * FROM push_subscriptions').all<{ install_id: string; address: string }>()).results
const pending = async () =>
  (await E.DB.prepare('SELECT address FROM push_unregister').all<{ address: string }>()).results.map((r) => r.address)

type Call = { url: string; init: RequestInit }
let calls: Call[]
let alchemyOk = true
let expoReply: () => Response
let receiptStatus: string | null // eth_getTransactionReceipt status of the tx; null = no receipt yet
let receiptsReply: (ids: string[]) => Response
let blockReply: () => Response // eth_getBlockByNumber (the canonical time of a push, Q26)
type AddressPatch = { addresses_to_add: string[]; addresses_to_remove: string[] }
type PushMessage = { title: string; body: string; data?: unknown }
const body = (c: Call) => JSON.parse(c.init.body as string) as AddressPatch
const messagesOf = (c: Call) => JSON.parse(c.init.body as string) as PushMessage[]
beforeEach(async () => {
  calls = []
  points = []
  alchemyOk = true
  blockReply = () =>
    new Response(
      JSON.stringify({ jsonrpc: '2.0', id: 1, result: { timestamp: `0x${(nowSeconds() - 20).toString(16)}` } }),
    )
  expoReply = () => new Response(JSON.stringify({ data: [{ status: 'ok', id: 'r1' }] }))
  receiptStatus = '0x1'
  receiptsReply = () => new Response(JSON.stringify({ data: {} }))
  vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
    calls.push({ url, init })
    if (url === addrPatch) return Promise.resolve(alchemyOk ? new Response('{}') : new Response('no', { status: 500 }))
    if (url === expoSend) return Promise.resolve(expoReply())
    if (url === expoReceipts)
      return Promise.resolve(receiptsReply((JSON.parse(init.body as string) as { ids: string[] }).ids))
    if (rpcUrl(url) && (JSON.parse(init.body as string) as { method: string }).method === 'eth_getBlockByNumber')
      return Promise.resolve(blockReply())
    if (rpcUrl(url))
      return Promise.resolve(
        new Response(
          JSON.stringify({ jsonrpc: '2.0', id: 1, result: receiptStatus === null ? null : { status: receiptStatus } }),
        ),
      )
    return Promise.reject(new Error('unexpected fetch'))
  })
  for (const t of ['push_sent', 'push_receipts', 'push_unregister', 'push_subscriptions', 'installs'])
    await E.DB.prepare(`DELETE FROM ${t}`).run()
})
afterEach(() => vi.unstubAllGlobals())

describe('push subscription routes', () => {
  it('needs a token', async () => {
    const r = await app.request('/v1/push/subscription', { method: 'DELETE', headers: { 'X-App-Version': '1.0.0' } }, E)
    expect(r.status).toBe(401)
  })

  it('registers a lowercase address with Alchemy and keeps the row', async () => {
    const id = await newInstall()
    const r = await put(id, { address: ADDR.toUpperCase().replace('0X', '0x'), expoToken: TOKEN })
    expect(r.status).toBe(200)
    expect(body(calls[0]!)).toEqual({ webhook_id: 'wh_test', addresses_to_add: [ADDR], addresses_to_remove: [] })
    expect((calls[0]!.init.headers as Record<string, string>)['X-Alchemy-Token']).toBe(E.ALCHEMY_NOTIFY_TOKEN)
    expect(await subs()).toMatchObject([{ install_id: id, address: ADDR }])
  })

  it('rejects a bad address or token', async () => {
    const id = await newInstall()
    expect((await put(id, { address: '0x12', expoToken: TOKEN })).status).toBe(400)
    expect((await put(id, { address: ADDR, expoToken: 'nope' })).status).toBe(400)
    expect(calls).toHaveLength(0)
  })

  it('keeps nothing when Alchemy fails', async () => {
    const id = await newInstall()
    alchemyOk = false
    const r = await put(id, { address: ADDR, expoToken: TOKEN })
    expect(r.status).toBe(503)
    expect(await subs()).toHaveLength(0)
  })

  it('deletes the row, then removes the address from Alchemy', async () => {
    const id = await newInstall()
    await put(id, { address: ADDR, expoToken: TOKEN })
    calls.length = 0
    expect((await del(id)).status).toBe(200)
    expect(await subs()).toHaveLength(0)
    expect(body(calls[0]!)).toEqual({ webhook_id: 'wh_test', addresses_to_add: [], addresses_to_remove: [ADDR] })
    expect(await pending()).toEqual([])
  })

  it('keeps the address on the webhook while another install still uses it', async () => {
    const a = await newInstall()
    const b = await newInstall()
    await put(a, { address: ADDR, expoToken: TOKEN })
    await put(b, { address: ADDR, expoToken: 'ExponentPushToken[zzzzzzzzzzzz]' })
    calls.length = 0
    await del(a)
    expect(calls).toHaveLength(0)
    expect(await subs()).toHaveLength(1)
  })

  it('queues a failed removal and cron retries it', async () => {
    const id = await newInstall()
    await put(id, { address: ADDR, expoToken: TOKEN })
    alchemyOk = false
    expect((await del(id)).status).toBe(200)
    expect(await subs()).toHaveLength(0)
    expect(await pending()).toEqual([ADDR])
    alchemyOk = true
    await sweep(E)
    expect(await pending()).toEqual([])
  })

  it('removes the old address when the wallet address changes', async () => {
    const id = await newInstall()
    await put(id, { address: ADDR, expoToken: TOKEN })
    calls.length = 0
    await put(id, { address: OTHER, expoToken: TOKEN })
    expect(body(calls[0]!).addresses_to_add).toEqual([OTHER])
    expect(body(calls[1]!).addresses_to_remove).toEqual([ADDR])
    expect(await subs()).toMatchObject([{ address: OTHER }])
  })

  it('expires subscriptions of installs inactive for 30 days', async () => {
    const stale = await newInstall(nowSeconds() - PUSH_INACTIVE_SECONDS - 10)
    const fresh = await newInstall()
    await put(stale, { address: ADDR, expoToken: TOKEN })
    await put(fresh, { address: OTHER, expoToken: TOKEN })
    await E.DB.prepare('INSERT INTO push_sent (install_id, ref, sent_at) VALUES (?, ?, ?)')
      .bind(stale, `${HASH}:native`, nowSeconds())
      .run()
    calls.length = 0
    await sweep(E)
    expect((await subs()).map((s) => s.install_id)).toEqual([fresh])
    expect(await E.DB.prepare('SELECT 1 FROM push_sent WHERE install_id = ?').bind(stale).first()).toBeNull()
    expect(body(calls[0]!).addresses_to_remove).toEqual([ADDR])
  })

  it('deletes installs idle for 90 days with their nonces and subscription (Q31)', async () => {
    const old = await newInstall(nowSeconds() - INSTALL_KEEP_SECONDS - 10)
    const idle = await newInstall(nowSeconds() - INSTALL_KEEP_SECONDS + 3600)
    await E.DB.prepare('INSERT INTO nonces (install_id, nonce, expires_at) VALUES (?, ?, ?)')
      .bind(old, 'n', nowSeconds() + 60)
      .run()
    await put(old, { address: ADDR, expoToken: TOKEN })
    await sweep(E)
    const ids = (await E.DB.prepare('SELECT id FROM installs').all<{ id: string }>()).results.map((r) => r.id)
    expect(ids).toContain(idle)
    expect(ids).not.toContain(old)
    expect(await E.DB.prepare('SELECT 1 FROM nonces WHERE install_id = ?').bind(old).first()).toBeNull()
    expect(await subs()).toEqual([])
  })
})

const sign = async (raw: string, key = E.ALCHEMY_SIGNING_KEY) => {
  const k = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(raw)))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
const activity = (a: Record<string, unknown>[], over: Record<string, unknown> = {}) => ({
  webhookId: 'wh_test',
  id: 'whevt_1',
  type: 'ADDRESS_ACTIVITY',
  event: { network: 'ETH_SEPOLIA', activity: a },
  ...over,
})
const eth = (o: Record<string, unknown> = {}) => ({
  hash: HASH,
  fromAddress: OTHER,
  toAddress: ADDR,
  value: 0.5,
  asset: 'ETH',
  category: 'external',
  rawContract: { rawValue: '0x6f05b59d3b20000', decimals: 18 },
  ...o,
})
const usdc = (o: Record<string, unknown> = {}) => ({
  hash: HASH,
  fromAddress: OTHER,
  toAddress: ADDR,
  value: 5,
  asset: 'USDC',
  category: 'token',
  rawContract: { rawValue: '0x4c4b40', address: USDC_SEPOLIA, decimals: 6 },
  log: { logIndex: '0x2', removed: false },
  ...o,
})
const hook = async (payload: unknown, sig?: string) => {
  const raw = JSON.stringify(payload)
  return app.request(
    '/webhooks/alchemy',
    {
      method: 'POST',
      headers: { 'X-Alchemy-Signature': sig ?? (await sign(raw)), 'content-type': 'application/json' },
      body: raw,
    },
    E,
  )
}
const sentMessages = () => calls.filter((c) => c.url === expoSend).flatMap(messagesOf)

describe('POST /webhooks/alchemy', () => {
  let install: string
  beforeEach(async () => {
    install = await newInstall()
    await put(install, { address: ADDR, expoToken: TOKEN })
    calls.length = 0
  })

  it('rejects a bad or missing signature without touching the database or Expo', async () => {
    expect((await hook(activity([eth()]), 'ab'.repeat(32))).status).toBe(401)
    expect((await hook(activity([eth()]), await sign('x', 'wrong-key'))).status).toBe(401)
    expect((await hook(activity([eth()]), 'not-hex')).status).toBe(401)
    expect(calls).toHaveLength(0)
  })

  it('pushes a deposit with no amount and no address on the lock screen', async () => {
    expect((await hook(activity([eth()]))).status).toBe(200)
    const [m] = sentMessages()
    expect(m).toMatchObject({
      to: TOKEN,
      title: '입금이 들어왔어요',
      body: '앱에서 확인해 주세요.',
      channelId: 'default', // the channel the app creates; without it Android uses the FCM fallback channel (#161)
    })
    expect(m?.data).toEqual({ kind: 'deposit' }) // no tx hash in the payload (#314, Q29)
    const text = JSON.stringify([m?.title, m?.body])
    expect(text).not.toMatch(/0x|ETH|USDC|0\.5/)
    expect((calls.find((c) => c.url === expoSend)!.init.headers as Record<string, string>).authorization).toBe(
      `Bearer ${E.EXPO_ACCESS_TOKEN}`,
    )
  })

  it('pushes a confirmed send', async () => {
    await hook(activity([eth({ fromAddress: ADDR, toAddress: OTHER })]))
    expect(sentMessages()).toMatchObject([{ channelId: 'default', data: { kind: 'send' } }])
  })

  describe('failed (own tx mined with receipt status 0, #314)', () => {
    const ownSend = (o: Record<string, unknown> = {}) => eth({ fromAddress: ADDR, toAddress: OTHER, ...o })
    const rpcCalls = () => calls.filter((c) => rpcUrl(c.url))

    it('pushes failed with the approved copy instead of send when the receipt status is 0x0', async () => {
      receiptStatus = '0x0'
      await hook(activity([ownSend()]))
      expect(sentMessages()).toMatchObject([
        {
          title: '보낸 거래가 실패했어요',
          body: '자산은 보내지지 않았고 수수료만 나갔어요. 앱에서 확인해 주세요.',
          data: { kind: 'failed' },
        },
      ])
      expect(sentMessages()[0]?.data).toEqual({ kind: 'failed' })
      expect(JSON.parse(rpcCalls()[0]!.init.body as string)).toMatchObject({
        method: 'eth_getTransactionReceipt',
        params: [HASH],
      })
    })

    it('pushes send when the receipt status is 0x1', async () => {
      await hook(activity([ownSend()]))
      expect(sentMessages().map((m) => m.data)).toEqual([{ kind: 'send' }])
    })

    it.each([
      ['no receipt yet', 'none'],
      ['an in-band RPC error', 'error'],
    ])('answers 503 and claims nothing on %s, so a retry can still push failed', async (_n, mode) => {
      const err = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const f = globalThis.fetch
      if (mode === 'error')
        vi.stubGlobal('fetch', (url: string, init: RequestInit) =>
          rpcUrl(url)
            ? Promise.resolve(
                new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'x' } })),
              )
            : f(url, init),
        )
      else receiptStatus = null
      for (const tx of [
        ownSend(),
        ownSend({ value: 0, rawContract: { rawValue: '0x0' }, hash: '0x' + '55'.repeat(32) }),
      ])
        expect((await hook(activity([tx]))).status).toBe(503)
      expect(sentMessages()).toHaveLength(0)
      expect(await E.DB.prepare('SELECT COUNT(*) AS n FROM push_sent').first<{ n: number }>()).toEqual({ n: 0 })
      vi.stubGlobal('fetch', f)
      receiptStatus = '0x0'
      expect((await hook(activity([ownSend()]))).status).toBe(200)
      expect(sentMessages().map((m) => m.data)).toEqual([{ kind: 'failed' }])
      err.mockRestore()
    })

    it('catches a reverted contract call: a zero-value outgoing tx is pushed only when it failed', async () => {
      const zero = ownSend({ value: 0, rawContract: { rawValue: '0x0' } })
      await hook(activity([zero])) // status 0x1 and nothing moved (a token leg would carry its own push)
      expect(sentMessages()).toHaveLength(0)
      receiptStatus = '0x0'
      await hook(activity([zero, { ...zero, hash: '0x' + '33'.repeat(32) }]))
      expect(sentMessages().map((m) => m.data)).toEqual([{ kind: 'failed' }, { kind: 'failed' }])
    })

    it('asks the chain only for own outgoing txs, once per hash', async () => {
      await hook(activity([eth()])) // deposit: no receipt lookup
      expect(rpcCalls()).toHaveLength(0)
      await hook(activity([ownSend(), usdc({ fromAddress: ADDR, toAddress: OTHER }), ownSend({ value: 0 })]))
      expect(rpcCalls()).toHaveLength(1)
    })

    it('answers 503 and sends nothing when the receipt cannot be read, then sends on the retry', async () => {
      const err = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const f = globalThis.fetch
      vi.stubGlobal('fetch', (url: string, init: RequestInit) =>
        rpcUrl(url) || url.startsWith('https://eth-sepolia.g.alchemy.com/')
          ? Promise.reject(new Error('down'))
          : f(url, init),
      )
      expect((await hook(activity([ownSend()]))).status).toBe(503)
      expect(sentMessages()).toHaveLength(0)
      expect(await E.DB.prepare('SELECT COUNT(*) AS n FROM push_sent').first<{ n: number }>()).toEqual({ n: 0 })
      vi.stubGlobal('fetch', f)
      receiptStatus = '0x0'
      expect((await hook(activity([ownSend()]))).status).toBe(200)
      expect(sentMessages().map((m) => m.data)).toEqual([{ kind: 'failed' }])
      err.mockRestore()
    })

    it('pushes failed for a self-send whose received leg won the kind', async () => {
      receiptStatus = '0x0'
      await hook(activity([ownSend({ toAddress: ADDR })]))
      expect(sentMessages().map((m) => m.data)).toEqual([{ kind: 'failed' }])
    })

    it('treats an unknown receipt status as unreadable (503, nothing claimed)', async () => {
      receiptStatus = '0x2'
      expect((await hook(activity([ownSend()]))).status).toBe(503)
      expect(sentMessages()).toHaveLength(0)
      expect(await E.DB.prepare('SELECT COUNT(*) AS n FROM push_sent').first<{ n: number }>()).toEqual({ n: 0 })
    })

    it('one unreadable receipt does not hold back the other pushes of the payload, but still answers 503', async () => {
      receiptStatus = null
      const dep = eth({ hash: '0x' + '66'.repeat(32) })
      expect((await hook(activity([ownSend(), dep]))).status).toBe(503)
      expect(sentMessages().map((m) => m.data)).toEqual([{ kind: 'deposit' }])
      receiptStatus = '0x0'
      expect((await hook(activity([ownSend(), dep]))).status).toBe(200)
      expect(sentMessages().map((m) => m.data)).toEqual([{ kind: 'deposit' }, { kind: 'failed' }])
    })

    it('keeps the claim semantics: one push per install and tx', async () => {
      receiptStatus = '0x0'
      await hook(activity([ownSend()]))
      await hook(activity([ownSend()]))
      expect(sentMessages()).toHaveLength(1)
    })
  })

  it('pushes an ERC-20 USDC deposit matched by contract address', async () => {
    await hook(activity([usdc()]))
    expect(sentMessages()).toHaveLength(1)
  })

  it('skips zero-value transfers, other tokens, fake USDC symbols, wrong network and reorged logs', async () => {
    await hook(activity([eth({ value: 0, rawContract: { rawValue: '0x0' } })]))
    await hook(activity([usdc({ rawContract: { rawValue: '0x0', address: USDC_SEPOLIA } })]))
    await hook(activity([usdc({ asset: 'DAI', rawContract: { rawValue: '0x1', address: '0x' + '99'.repeat(20) } })]))
    await hook(activity([usdc({ rawContract: { rawValue: '0x4c4b40', address: '0x' + '99'.repeat(20) } })])) // symbol says USDC, contract does not
    await hook(activity([eth({ category: 'erc721', asset: 'NFT' })]))
    await hook(activity([eth()], { event: { network: 'ETH_MAINNET', activity: [eth()] } }))
    await hook(activity([usdc({ log: { logIndex: '0x2', removed: true } })]))
    expect(sentMessages()).toHaveLength(0)
  })

  it('ignores a webhook id that is not ours', async () => {
    await hook(activity([eth()], { webhookId: 'other' }))
    expect(sentMessages()).toHaveLength(0)
  })

  it('sends once when Alchemy retries the same event', async () => {
    await hook(activity([eth()]))
    await hook(activity([eth()]))
    expect(sentMessages()).toHaveLength(1)
  })

  it('does not push twice to an address that both sends and receives in one transfer', async () => {
    await hook(activity([eth({ fromAddress: ADDR, toAddress: ADDR })]))
    expect(sentMessages()).toHaveLength(1)
  })

  it.each([
    ['in then out', false],
    ['out then in', true],
  ])('pushes one deposit for a tx with an external-in and an internal-out leg (%s)', async (_n, reversed) => {
    const legIn = eth()
    const legOut = eth({ fromAddress: ADDR, toAddress: OTHER, category: 'internal' })
    await hook(activity(reversed ? [legOut, legIn] : [legIn, legOut]))
    expect(sentMessages()).toMatchObject([{ data: { kind: 'deposit' } }])
  })

  it('does not push again when a later webhook carries the other leg of the same tx', async () => {
    await hook(activity([eth()]))
    await hook(activity([eth({ fromAddress: ADDR, toAddress: OTHER, category: 'internal' })]))
    expect(sentMessages()).toHaveLength(1)
  })

  it('pushes once when the two legs of one tx arrive in concurrent webhooks', async () => {
    const res = await Promise.all([
      hook(activity([eth()])),
      hook(activity([eth({ fromAddress: ADDR, toAddress: OTHER, category: 'internal' })])),
    ])
    expect(res.map((r) => r.status)).toEqual([200, 200])
    expect(sentMessages()).toHaveLength(1)
  })

  it('answers 503 when Expo is down, then sends on the retry', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expoReply = () => new Response('x', { status: 502 })
    expect((await hook(activity([eth()]))).status).toBe(503)
    expect(logged(err)).toContainEqual(expect.objectContaining({ event: 'push_upstream', reason: 'expo 502' })) // a failed batch leaves a log line (#263)
    err.mockRestore()
    expoReply = () => new Response(JSON.stringify({ data: [{ status: 'ok', id: 'r1' }] }))
    expect((await hook(activity([eth()]))).status).toBe(200)
    expect(await E.DB.prepare('SELECT COUNT(*) AS n FROM push_sent').first<{ n: number }>()).toEqual({ n: 1 })
  })

  it('does not mark an Expo error ticket as sent, so the retry sends it', async () => {
    expoReply = () =>
      new Response(
        JSON.stringify({ data: [{ status: 'error', message: 'x', details: { error: 'MessageRateExceeded' } }] }),
      )
    expect((await hook(activity([eth()]))).status).toBe(503)
    expect(await E.DB.prepare('SELECT COUNT(*) AS n FROM push_sent').first<{ n: number }>()).toEqual({ n: 0 })
    expoReply = () => new Response(JSON.stringify({ data: [{ status: 'ok', id: 'r1' }] }))
    expect((await hook(activity([eth()]))).status).toBe(200)
    expect(sentMessages()).toHaveLength(2)
  })

  it('deletes the subscription and the address when Expo says DeviceNotRegistered', async () => {
    expoReply = () =>
      new Response(
        JSON.stringify({ data: [{ status: 'error', message: 'x', details: { error: 'DeviceNotRegistered' } }] }),
      )
    await hook(activity([eth()]))
    expect(await subs()).toHaveLength(0)
    expect(calls.some((c) => c.url === addrPatch && body(c).addresses_to_remove[0] === ADDR)).toBe(true)
  })

  it('logs the push outcome and Expo ticket ids, never an address or token (#263)', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    expoReply = () =>
      new Response(
        JSON.stringify({
          data: [{ status: 'error', message: 'x', details: { error: 'MessageRateExceeded' } }],
        }),
      )
    await hook(activity([eth()]))
    expoReply = () => new Response(JSON.stringify({ data: [{ status: 'ok', id: 'r1' }] }))
    await hook(activity([eth()]))
    await hook(activity([eth({ toAddress: '0x' + '77'.repeat(20) })]))
    const lines = logged(log)
    expect(lines).toContainEqual(expect.objectContaining({ event: 'push_outcome', subs: 1, notes: 1, jobs: 1 }))
    expect(lines).toContainEqual(
      expect.objectContaining({ event: 'expo_tickets', ok: 0, errors: 'MessageRateExceeded' }),
    )
    expect(lines).toContainEqual(
      expect.objectContaining({ event: 'expo_tickets', ok: 1, errors: '', receipt_ids: 'r1' }),
    )
    expect(lines).toContainEqual(expect.objectContaining({ event: 'push_outcome', subs: 0, notes: 0, jobs: 0 }))
    const text = JSON.stringify(lines)
    expect(text).not.toContain(ADDR.slice(2, 12))
    expect(text).not.toContain(HASH.slice(2, 12))
    expect(text).not.toContain(TOKEN)
    expect(lines.every((l) => typeof l.requestId === 'string')).toBe(true) // one request id per webhook delivery
    log.mockRestore()
  })

  it('does nothing for addresses nobody subscribed', async () => {
    await hook(activity([eth({ toAddress: '0x' + '77'.repeat(20) })]))
    expect(sentMessages()).toHaveLength(0)
  })

  it('looks up more than 100 addresses in one payload', async () => {
    const many = Array.from({ length: 150 }, (_, i) =>
      eth({
        toAddress: '0x' + (i + 1).toString(16).padStart(40, '0'),
        hash: '0x' + (i + 1).toString(16).padStart(64, '0'),
      }),
    )
    expect((await hook(activity([...many, eth()]))).status).toBe(200)
    expect(sentMessages()).toHaveLength(1)
  })

  it('refuses a malformed body', async () => {
    const raw = '{"nope":1}'
    const r = await app.request(
      '/webhooks/alchemy',
      { method: 'POST', headers: { 'X-Alchemy-Signature': await sign(raw) }, body: raw },
      E,
    )
    expect(r.status).toBe(400)
  })
})

describe('Expo receipts (Q39, #314)', () => {
  const ids = async () =>
    (
      await E.DB.prepare('SELECT receipt_id FROM push_receipts ORDER BY receipt_id').all<{ receipt_id: string }>()
    ).results.map((r) => r.receipt_id)
  const age = (seconds: number) =>
    E.DB.prepare('UPDATE push_receipts SET created_at = created_at - ?').bind(seconds).run()
  const getReceiptCalls = () => calls.filter((c) => c.url === expoReceipts)
  let install: string
  beforeEach(async () => {
    install = await newInstall()
    await put(install, { address: ADDR, expoToken: TOKEN })
    calls.length = 0
  })

  it('stores the receipt id of an ok ticket with the install and token, and not those of error tickets', async () => {
    await hook(activity([eth()]))
    expect(await ids()).toEqual(['r1'])
    expect(await E.DB.prepare('SELECT install_id, expo_token FROM push_receipts').first()).toEqual({
      install_id: install,
      expo_token: TOKEN,
    })
    expoReply = () =>
      new Response(
        JSON.stringify({ data: [{ status: 'error', message: 'x', details: { error: 'MessageRateExceeded' } }] }),
      )
    await hook(activity([eth({ hash: '0x' + '44'.repeat(32) })]))
    expect(await ids()).toEqual(['r1'])
  })

  it('does not fetch receipts younger than the delay', async () => {
    await hook(activity([eth()]))
    await age(PUSH_RECEIPT_DELAY_SECONDS - 60)
    await sweep(E)
    expect(getReceiptCalls()).toHaveLength(0)
    expect(await ids()).toEqual(['r1'])
  })

  it('fetches old receipts, deletes the subscription on DeviceNotRegistered, then deletes the checked ids', async () => {
    await hook(activity([eth()]))
    await age(PUSH_RECEIPT_DELAY_SECONDS + 1)
    receiptsReply = () =>
      new Response(
        JSON.stringify({ data: { r1: { status: 'error', message: 'x', details: { error: 'DeviceNotRegistered' } } } }),
      )
    calls.length = 0
    await sweep(E)
    expect(JSON.parse(getReceiptCalls()[0]!.init.body as string)).toEqual({ ids: ['r1'] })
    expect((getReceiptCalls()[0]!.init.headers as Record<string, string>).authorization).toBe(
      `Bearer ${E.EXPO_ACCESS_TOKEN}`,
    )
    expect(await subs()).toHaveLength(0)
    expect(calls.some((c) => c.url === addrPatch && body(c).addresses_to_remove[0] === ADDR)).toBe(true)
    expect(await ids()).toEqual([])
  })

  it('keeps the subscription on an ok receipt, and keeps ids Expo has no receipt for yet', async () => {
    await hook(activity([eth()]))
    await age(PUSH_RECEIPT_DELAY_SECONDS + 1)
    await sweep(E) // no receipt in the answer
    expect(await ids()).toEqual(['r1'])
    receiptsReply = () => new Response(JSON.stringify({ data: { r1: { status: 'ok' } } }))
    await sweep(E)
    expect(await subs()).toHaveLength(1)
    expect(await ids()).toEqual([])
  })

  it('does not delete a subscription that got a new token since the push', async () => {
    await hook(activity([eth()]))
    await age(PUSH_RECEIPT_DELAY_SECONDS + 1)
    await put(install, { address: ADDR, expoToken: 'ExponentPushToken[zzzzzzzzzzzz]' })
    receiptsReply = () =>
      new Response(JSON.stringify({ data: { r1: { status: 'error', details: { error: 'DeviceNotRegistered' } } } }))
    await sweep(E)
    expect(await subs()).toHaveLength(1)
    expect(await ids()).toEqual([])
  })

  it('keeps the ids when Expo is down, and purges ids older than 7 days regardless', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await hook(activity([eth()]))
    await age(PUSH_RECEIPT_DELAY_SECONDS + 1)
    receiptsReply = () => new Response('x', { status: 502 })
    await sweep(E)
    expect(await ids()).toEqual(['r1'])
    await age(7 * 24 * 3600)
    await sweep(E)
    expect(await ids()).toEqual([])
    err.mockRestore()
  })

  it('asks for at most 300 ids per request', async () => {
    const t = nowSeconds() - PUSH_RECEIPT_DELAY_SECONDS - 5
    await E.DB.batch(
      Array.from({ length: 301 }, (_, i) =>
        E.DB.prepare(
          'INSERT INTO push_receipts (receipt_id, install_id, expo_token, created_at) VALUES (?, ?, ?, ?)',
        ).bind(`id${String(i)}`, install, TOKEN, t),
      ),
    )
    receiptsReply = (got) =>
      new Response(JSON.stringify({ data: Object.fromEntries(got.map((i) => [i, { status: 'ok' }])) }))
    await sweep(E)
    expect(getReceiptCalls().map((c) => (JSON.parse(c.init.body as string) as { ids: string[] }).ids.length)).toEqual([
      300, 1,
    ])
    expect(await ids()).toEqual([])
  })

  it('still answers 200 and keeps the claim when the receipt ids cannot be stored', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await E.DB.prepare('ALTER TABLE push_receipts RENAME TO push_receipts_off').run()
    try {
      expect((await hook(activity([eth()]))).status).toBe(200)
    } finally {
      await E.DB.prepare('ALTER TABLE push_receipts_off RENAME TO push_receipts').run()
    }
    expect(logged(err)).toContainEqual(expect.objectContaining({ event: 'push_receipt_ids_not_stored' }))
    expect(sentMessages()).toHaveLength(1)
    err.mockRestore()
  })

  it('removes the receipt ids of an install whose subscription expired by inactivity', async () => {
    await hook(activity([eth()]))
    await E.DB.prepare('UPDATE installs SET last_seen_at = ? WHERE id = ?')
      .bind(nowSeconds() - PUSH_INACTIVE_SECONDS - 10, install)
      .run()
    await sweep(E)
    expect(await ids()).toEqual([])
  })

  it('removes the install receipt ids when the subscription is deleted', async () => {
    await hook(activity([eth()]))
    expect(await ids()).toEqual(['r1'])
    await del(install)
    expect(await ids()).toEqual([])
  })

  it('reads the newest ids first when 1000 older ones are waiting', async () => {
    const ins = (id: string, t: number) =>
      E.DB.prepare(
        'INSERT INTO push_receipts (receipt_id, install_id, expo_token, created_at) VALUES (?, ?, ?, ?)',
      ).bind(id, install, TOKEN, t)
    await E.DB.batch([
      ...Array.from({ length: 1000 }, (_, i) => ins(`old${String(i)}`, nowSeconds() - 3 * 24 * 3600)),
      ins('fresh', nowSeconds() - PUSH_RECEIPT_DELAY_SECONDS - 5),
    ])
    receiptsReply = () =>
      new Response(JSON.stringify({ data: { fresh: { status: 'error', details: { error: 'DeviceNotRegistered' } } } }))
    await sweep(E)
    expect(await subs()).toHaveLength(0) // the fresh id was read although 1000 older ones are unanswered
  })
})

describe('observability (#315)', () => {
  const blockCalls = () =>
    calls.filter((c) => rpcUrl(c.url) && (c.init.body as string).includes('eth_getBlockByNumber'))
  const pointsOf = (event: string) => points.filter((p) => p.indexes?.[0] === event)
  beforeEach(async () => {
    const install = await newInstall()
    await put(install, { address: ADDR, expoToken: TOKEN })
    calls.length = 0
    points = []
  })

  it('Q26: logs and records the seconds from the block timestamp to the Expo hand-off, after the send', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    expect((await hook(activity([eth({ blockNum: '0x10' })]))).status).toBe(200)
    expect(blockCalls()).toHaveLength(1)
    expect(calls.findIndex((c) => c.url === expoSend)).toBeLessThan(calls.indexOf(blockCalls()[0]!)) // the lookup never delays the push
    const line = logged(log).find((l) => l.event === 'push_latency')
    expect(line).toMatchObject({ kind: 'deposit' })
    expect(line?.seconds).toBeGreaterThanOrEqual(20)
    expect(line?.seconds).toBeLessThan(30)
    expect(pointsOf('push_latency')).toHaveLength(1)
    expect(pointsOf('push_latency')[0]).toMatchObject({ blobs: ['deposit'] })
    expect(pointsOf('push_latency')[0]?.doubles?.[0]).toBeGreaterThanOrEqual(20)
    expect(JSON.stringify(points)).not.toContain(ADDR.slice(2, 12))
  })

  it('a block time in the future (clock skew) is 0 seconds, not negative', async () => {
    blockReply = () =>
      new Response(
        JSON.stringify({ jsonrpc: '2.0', id: 1, result: { timestamp: `0x${(nowSeconds() + 60).toString(16)}` } }),
      )
    await hook(activity([eth({ blockNum: '0x10' })]))
    expect(pointsOf('push_latency')[0]?.doubles).toEqual([0, 1])
  })

  it.each([
    ['no block number in the activity', () => undefined],
    ['the block cannot be read', () => (blockReply = () => new Response('x', { status: 500 }))],
    [
      'the block has no timestamp',
      () => (blockReply = () => new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: null }))),
    ],
  ])('logs a warning and records nothing when %s, and still answers 200', async (_n, setup) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    setup()
    const act = eth(_n === 'no block number in the activity' ? {} : { blockNum: '0x10' })
    expect((await hook(activity([act]))).status).toBe(200)
    expect(logged(warn)).toContainEqual(expect.objectContaining({ event: 'push_latency_unavailable', kind: 'deposit' }))
    expect(pointsOf('push_latency')).toHaveLength(0)
  })

  it('records the Expo ticket outcome of each message, without address or token', async () => {
    expoReply = () =>
      new Response(JSON.stringify({ data: [{ status: 'error', details: { error: 'MessageRateExceeded' } }] }))
    await hook(activity([eth()]))
    expoReply = () => new Response(JSON.stringify({ data: [{ status: 'ok', id: 'r1' }] }))
    await hook(activity([eth()]))
    expect(pointsOf('push_ticket')).toEqual([
      { indexes: ['push_ticket'], blobs: ['MessageRateExceeded'], doubles: [1] },
      { indexes: ['push_ticket'], blobs: ['ok'], doubles: [1] },
    ])
  })

  it('records the Expo receipt outcome of each checked id', async () => {
    await hook(activity([eth()]))
    await E.DB.prepare('UPDATE push_receipts SET created_at = created_at - ?')
      .bind(PUSH_RECEIPT_DELAY_SECONDS + 1)
      .run()
    receiptsReply = () =>
      new Response(JSON.stringify({ data: { r1: { status: 'error', details: { error: 'DeviceNotRegistered' } } } }))
    await sweep(E)
    expect(pointsOf('push_receipt')).toEqual([
      { indexes: ['push_receipt'], blobs: ['DeviceNotRegistered'], doubles: [1] },
    ])
  })

  it('takes the block number from a later leg when the kept deposit leg has none', async () => {
    await hook(activity([eth(), eth({ blockNum: '0x10', category: 'internal' })]))
    expect(pointsOf('push_latency')).toHaveLength(1)
  })

  it('writes one latency point per kind and block with a count, not one per push (250 points per invocation)', async () => {
    const others = ['0x' + 'e1'.repeat(20), '0x' + 'e2'.repeat(20)]
    for (const a of others) await put(await newInstall(), { address: a, expoToken: TOKEN })
    expoReply = () =>
      new Response(
        JSON.stringify({ data: Array.from({ length: 3 }, (_, i) => ({ status: 'ok', id: `r${String(i)}` })) }),
      )
    await hook(activity([ADDR, ...others].map((to) => eth({ toAddress: to, blockNum: '0x10', hash: HASH }))))
    expect(sentMessages()).toHaveLength(3)
    expect(blockCalls()).toHaveLength(1)
    expect(pointsOf('push_latency')).toHaveLength(1)
    expect(pointsOf('push_latency')[0]?.doubles?.[1]).toBe(3)
    expect(pointsOf('push_ticket')).toEqual([{ indexes: ['push_ticket'], blobs: ['ok'], doubles: [3] }])
  })

  it('labels an Expo error it does not know as `other`, in the data point and the log (Expo text is not ours)', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const odd = `bad ${TOKEN}`
    expoReply = () => new Response(JSON.stringify({ data: [{ status: 'error', details: { error: odd } }] }))
    await hook(activity([eth()]))
    expect(pointsOf('push_ticket')).toEqual([{ indexes: ['push_ticket'], blobs: ['other'], doubles: [1] }])
    expect(JSON.stringify(logged(log))).not.toContain('bad')
    expoReply = () => new Response(JSON.stringify({ data: [{ status: 'ok', id: 'r1' }] }))
    await hook(activity([eth({ hash: '0x' + '22'.repeat(32) })]))
    await E.DB.prepare('UPDATE push_receipts SET created_at = created_at - ?')
      .bind(PUSH_RECEIPT_DELAY_SECONDS + 1)
      .run()
    receiptsReply = () => new Response(JSON.stringify({ data: { r1: { status: 'error', details: { error: odd } } } }))
    await sweep(E)
    expect(pointsOf('push_receipt')).toEqual([{ indexes: ['push_receipt'], blobs: ['other'], doubles: [1] }])
  })
})
