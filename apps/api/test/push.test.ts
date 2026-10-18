import { env } from 'cloudflare:workers'
import { USDC_SEPOLIA } from '@vaultme/contracts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../src/app.ts'
import { b64uEncode, issueToken, nowSeconds } from '../src/auth.ts'
import { PUSH_INACTIVE_SECONDS, sweep } from '../src/push.ts'

const open: RateLimit = { limit: async () => ({ success: true }) }
const rand = () => b64uEncode(crypto.getRandomValues(new Uint8Array(24)))
const E = {
  ...env,
  TOKEN_SECRET: rand() + rand(),
  INSTALL_LIMITER: open,
  INSTALL_IP_LIMITER: open,
  ALCHEMY_WEBHOOK_ID: 'wh_test',
  ALCHEMY_SIGNING_KEY: rand(),
  ALCHEMY_NOTIFY_TOKEN: rand(),
  EXPO_ACCESS_TOKEN: rand(),
}
const ADDR = '0x' + 'ab'.repeat(20)
const OTHER = '0x' + 'cd'.repeat(20)
const HASH = '0x' + '11'.repeat(32)
const TOKEN = 'ExponentPushToken[abcdefghijklmnop]'
const addrPatch = 'https://dashboard.alchemy.com/api/update-webhook-addresses'
const expoSend = 'https://exp.host/--/api/v2/push/send'

const newInstall = async (lastSeen = nowSeconds()) => {
  const id = crypto.randomUUID()
  await E.DB.prepare('INSERT INTO installs (id, public_key, created_at, last_seen_at) VALUES (?, ?, ?, ?)').bind(id, 'k', lastSeen, lastSeen).run()
  return id
}
const auth = async (id: string) => ({ Authorization: `Bearer ${(await issueToken({ env: E } as never, id)).token}`, 'X-App-Version': '1.0.0' })
const put = async (id: string, body: unknown) =>
  app.request('/v1/push/subscription', { method: 'PUT', headers: { ...(await auth(id)), 'content-type': 'application/json' }, body: JSON.stringify(body) }, E)
const del = async (id: string) => app.request('/v1/push/subscription', { method: 'DELETE', headers: await auth(id) }, E)
const subs = async () => (await E.DB.prepare('SELECT * FROM push_subscriptions').all<{ install_id: string; address: string }>()).results
const pending = async () => (await E.DB.prepare('SELECT address FROM push_unregister').all<{ address: string }>()).results.map((r) => r.address)

type Call = { url: string; init: RequestInit }
let calls: Call[]
let alchemyOk = true
let expoReply: () => Response
const body = (c: Call) => JSON.parse(c.init.body as string)
beforeEach(async () => {
  calls = []
  alchemyOk = true
  expoReply = () => new Response(JSON.stringify({ data: [{ status: 'ok', id: 'r1' }] }))
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    if (url === addrPatch) return alchemyOk ? new Response('{}') : new Response('no', { status: 500 })
    if (url === expoSend) return expoReply()
    throw new Error('unexpected fetch')
  })
  for (const t of ['push_sent', 'push_unregister', 'push_subscriptions', 'installs']) await E.DB.prepare(`DELETE FROM ${t}`).run()
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
    calls.length = 0
    await sweep(E)
    expect((await subs()).map((s) => s.install_id)).toEqual([fresh])
    expect(body(calls[0]!).addresses_to_remove).toEqual([ADDR])
  })
})

const sign = async (raw: string, key = E.ALCHEMY_SIGNING_KEY) => {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(raw)))].map((b) => b.toString(16).padStart(2, '0')).join('')
}
const activity = (a: Record<string, unknown>[], over: Record<string, unknown> = {}) => ({
  webhookId: 'wh_test',
  id: 'whevt_1',
  type: 'ADDRESS_ACTIVITY',
  event: { network: 'ETH_SEPOLIA', activity: a },
  ...over,
})
const eth = (o: Record<string, unknown> = {}) => ({
  hash: HASH, fromAddress: OTHER, toAddress: ADDR, value: 0.5, asset: 'ETH', category: 'external', rawContract: { rawValue: '0x6f05b59d3b20000', decimals: 18 }, ...o,
})
const usdc = (o: Record<string, unknown> = {}) => ({
  hash: HASH, fromAddress: OTHER, toAddress: ADDR, value: 5, asset: 'USDC', category: 'token',
  rawContract: { rawValue: '0x4c4b40', address: USDC_SEPOLIA, decimals: 6 }, log: { logIndex: '0x2', removed: false }, ...o,
})
const hook = async (payload: unknown, sig?: string) => {
  const raw = JSON.stringify(payload)
  return app.request('/webhooks/alchemy', { method: 'POST', headers: { 'X-Alchemy-Signature': sig ?? (await sign(raw)), 'content-type': 'application/json' }, body: raw }, E)
}
const sentMessages = () => calls.filter((c) => c.url === expoSend).flatMap(body)

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
    expect(m).toMatchObject({ to: TOKEN, title: 'VaultMe', body: '입금이 들어왔어요. 앱에서 확인해 주세요.', data: { kind: 'deposit', hash: HASH } })
    const text = JSON.stringify([m.title, m.body])
    expect(text).not.toMatch(/0x|ETH|USDC|0\.5/)
    expect((calls.find((c) => c.url === expoSend)!.init.headers as Record<string, string>).authorization).toBe(`Bearer ${E.EXPO_ACCESS_TOKEN}`)
  })

  it('pushes a confirmed send', async () => {
    await hook(activity([eth({ fromAddress: ADDR, toAddress: OTHER })]))
    expect(sentMessages()).toMatchObject([{ data: { kind: 'send', hash: HASH } }])
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

  it('answers 503 when Expo is down, then sends on the retry', async () => {
    expoReply = () => new Response('x', { status: 502 })
    expect((await hook(activity([eth()]))).status).toBe(503)
    expoReply = () => new Response(JSON.stringify({ data: [{ status: 'ok', id: 'r1' }] }))
    expect((await hook(activity([eth()]))).status).toBe(200)
    expect(await E.DB.prepare('SELECT COUNT(*) AS n FROM push_sent').first<{ n: number }>()).toEqual({ n: 1 })
  })

  it('does not mark an Expo error ticket as sent, so the retry sends it', async () => {
    expoReply = () => new Response(JSON.stringify({ data: [{ status: 'error', message: 'x', details: { error: 'MessageRateExceeded' } }] }))
    expect((await hook(activity([eth()]))).status).toBe(503)
    expect(await E.DB.prepare('SELECT COUNT(*) AS n FROM push_sent').first<{ n: number }>()).toEqual({ n: 0 })
    expoReply = () => new Response(JSON.stringify({ data: [{ status: 'ok', id: 'r1' }] }))
    expect((await hook(activity([eth()]))).status).toBe(200)
    expect(sentMessages()).toHaveLength(2)
  })

  it('deletes the subscription and the address when Expo says DeviceNotRegistered', async () => {
    expoReply = () => new Response(JSON.stringify({ data: [{ status: 'error', message: 'x', details: { error: 'DeviceNotRegistered' } }] }))
    await hook(activity([eth()]))
    expect(await subs()).toHaveLength(0)
    expect(calls.some((c) => c.url === addrPatch && body(c).addresses_to_remove[0] === ADDR)).toBe(true)
  })

  it('does nothing for addresses nobody subscribed', async () => {
    await hook(activity([eth({ toAddress: '0x' + '77'.repeat(20) })]))
    expect(sentMessages()).toHaveLength(0)
  })

  it('refuses a malformed body', async () => {
    const raw = '{"nope":1}'
    const r = await app.request('/webhooks/alchemy', { method: 'POST', headers: { 'X-Alchemy-Signature': await sign(raw) }, body: raw }, E)
    expect(r.status).toBe(400)
  })
})
