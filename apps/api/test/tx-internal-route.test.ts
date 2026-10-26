import { env } from 'cloudflare:workers'
import { ErrorEnvelope, TxInternalResponse } from '@vaultme/contracts'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { app } from '../src/app.ts'
import { b64uEncode, issueToken } from '../src/auth.ts'

const open: RateLimit = { limit: () => Promise.resolve({ success: true }) }
const rand = () => b64uEncode(crypto.getRandomValues(new Uint8Array(24)))
const grant = (wait: number | null) =>
  ({ getByName: () => ({ acquire: () => Promise.resolve(wait) }) }) as unknown as typeof env.ETHERSCAN_BUCKET
const KEY = 'KEY' + rand()
const E = {
  ...env,
  TOKEN_SECRET: rand() + rand(),
  ETHERSCAN_API_KEY: KEY,
  INSTALL_LIMITER: open,
  HISTORY_IP_LIMITER: open,
  ETHERSCAN_BUCKET: grant(0),
}
const bearer = async () => ({
  Authorization: `Bearer ${(await issueToken({ env: E } as never, crypto.randomUUID())).token}`,
})
const post = async (body: unknown, e: typeof E = E, auth = true) =>
  app.request(
    '/v1/tx/internal',
    {
      method: 'POST',
      headers: { 'X-App-Version': '1.0.0', 'content-type': 'application/json', ...(auth ? await bearer() : {}) },
      body: JSON.stringify(body),
    },
    e,
  )

const HASH = '0x' + 'AB'.repeat(32)
const A = '0x' + 'a'.repeat(40)
const B = '0x' + 'B'.repeat(40)
const row = (o: Record<string, string> = {}) => ({
  blockNumber: '10',
  timeStamp: '1700000000',
  from: A,
  to: B,
  value: '1000',
  type: 'call',
  isError: '0',
  errCode: '',
  ...o,
})
const ok = (result: unknown[]) => Response.json({ status: '1', message: 'OK', result })
const empty = () => Response.json({ status: '0', message: 'No transactions found', result: [] })
const notok = (result: string | null, message = 'NOTOK') => Response.json({ status: '0', message, result })
const mock = (res: () => Response) => {
  const f = vi.fn<(u: URL) => Promise<Response>>(() => Promise.resolve(res()))
  vi.stubGlobal('fetch', f)
  return f
}
afterEach(() => vi.unstubAllGlobals())

describe('POST /v1/tx/internal', () => {
  it('asks Etherscan V2 by txhash for Sepolia and maps the rows', async () => {
    const f = mock(() => ok([row(), row({ to: '', isError: '1', value: '5' })]))
    const r = await post({ hash: HASH })
    expect(r.status).toBe(200)
    expect(TxInternalResponse.parse(await r.json()).items).toEqual([
      { from: A, to: B.toLowerCase(), value: '1000', ok: true },
      { from: A, to: null, value: '5', ok: false },
    ])
    expect(f).toHaveBeenCalledTimes(1)
    const u = f.mock.calls[0]![0]
    expect(u.origin + u.pathname).toBe('https://api.etherscan.io/v2/api')
    expect(Object.fromEntries(u.searchParams)).toMatchObject({
      chainid: '11155111',
      module: 'account',
      action: 'txlistinternal',
      txhash: HASH.toLowerCase(),
    })
  })

  it('"No transactions found" is an empty list', async () => {
    mock(empty)
    const r = await post({ hash: HASH })
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ items: [] })
  })

  it('401 without a token, no upstream call', async () => {
    const f = mock(empty)
    expect((await post({ hash: HASH }, E, false)).status).toBe(401)
    expect(f).not.toHaveBeenCalled()
  })

  it('429 when the IP limiter says so', async () => {
    const f = mock(empty)
    const r = await post(
      { hash: HASH },
      { ...E, HISTORY_IP_LIMITER: { limit: () => Promise.resolve({ success: false }) } },
    )
    expect(r.status).toBe(429)
    expect(f).not.toHaveBeenCalled()
  })

  it.each([
    ['short', '0x12'],
    ['an address', A],
    ['no 0x', 'a'.repeat(64)],
    ['non hex', '0x' + 'g'.repeat(64)],
    ['missing', undefined],
  ])('400 on a bad hash (%s), no upstream call', async (_n, hash) => {
    const f = mock(empty)
    const r = await post({ hash })
    expect(r.status).toBe(400)
    expect(ErrorEnvelope.parse(await r.json())).toMatchObject({ code: 'invalid_request', retryable: false })
    expect(f).not.toHaveBeenCalled()
  })

  it('500 and no upstream call when ETHERSCAN_API_KEY is missing', async () => {
    const f = mock(empty)
    expect((await post({ hash: HASH }, { ...E, ETHERSCAN_API_KEY: '' })).status).toBe(500)
    expect(f).not.toHaveBeenCalled()
  })

  it.each([
    ['bad row', () => ok([{ from: 'x' }])],
    ['bad value', () => ok([row({ value: '-1' })])],
    ['unknown isError', () => ok([row({ isError: '2' })])],
    ['missing isError', () => ok([{ from: A, to: B, value: '1' }])],
    ['Query Timeout', () => notok(null, 'Query Timeout occured')],
    ['invalid key', () => notok('Invalid API Key (#err2)')],
    ['http 500', () => new Response('boom ' + KEY, { status: 500 })],
    ['not json', () => new Response('<html>' + KEY + '</html>')],
  ])('503 retryable, nothing leaks (%s)', async (_n, res) => {
    mock(res)
    const r = await post({ hash: HASH })
    expect(r.status).toBe(503)
    const text = await r.text()
    expect(ErrorEnvelope.parse(JSON.parse(text))).toEqual({
      code: 'unavailable',
      message: 'Internal transfers unavailable',
      retryable: true,
    })
    expect(text).not.toContain(KEY)
  })

  it('503 without calling Etherscan when the bucket has no token within 2 s', async () => {
    const f = mock(empty)
    expect((await post({ hash: HASH }, { ...E, ETHERSCAN_BUCKET: grant(null) })).status).toBe(503)
    expect(f).not.toHaveBeenCalled()
  })

  it('rate limit message: one more try through the bucket, then success', async () => {
    let n = 0
    const f = mock(() => (n++ === 0 ? notok('Max calls per sec rate limit reached (3/sec)') : ok([row()])))
    const r = await post({ hash: HASH })
    expect(r.status).toBe(200)
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('rate limit message twice -> 503', async () => {
    const f = mock(() => notok('Max calls per sec rate limit reached (3/sec)'))
    expect((await post({ hash: HASH })).status).toBe(503)
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('a contract creation row has no recipient', async () => {
    mock(() => ok([row({ to: '' })]))
    expect(TxInternalResponse.parse(await (await post({ hash: HASH })).json()).items[0]?.to).toBeNull()
  })
})
