import { env } from 'cloudflare:workers'
import { ErrorEnvelope, HistoryResponse, USDC_SEPOLIA } from '@vaultme/contracts'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { app } from '../src/app.ts'
import { b64uEncode, issueToken } from '../src/auth.ts'

const open: RateLimit = { limit: async () => ({ success: true }) }
const rand = () => b64uEncode(crypto.getRandomValues(new Uint8Array(24)))
const grant = (wait: number | null) => ({ getByName: () => ({ acquire: async () => wait }) }) as unknown as typeof env.ETHERSCAN_BUCKET
// Unique key so a leak is easy to grep for.
const KEY = 'KEY' + rand()
const E = {
  ...env, TOKEN_SECRET: rand() + rand(), ETHERSCAN_API_KEY: KEY, INSTALL_LIMITER: open, HISTORY_IP_LIMITER: open, ETHERSCAN_BUCKET: grant(0),
}
const bearer = async () => ({ Authorization: `Bearer ${(await issueToken({ env: E } as never, crypto.randomUUID())).token}` })
const newAddress = () => '0x' + [...crypto.getRandomValues(new Uint8Array(20))].map((x) => x.toString(16).padStart(2, '0')).join('')

const post = async (body: unknown, e: typeof E = E, auth = true) =>
  app.request('/v1/history', { method: 'POST', headers: { 'X-App-Version': '1.0.0', 'content-type': 'application/json', ...(auth ? await bearer() : {}) }, body: JSON.stringify(body) }, e)

const hash = (n: number) => '0x' + n.toString(16).padStart(64, '0')
const row = (address: string, block: number, o: Record<string, string> = {}) => ({
  hash: hash(block), blockNumber: String(block), timeStamp: '1700000000', transactionIndex: '0', from: '0x' + 'b'.repeat(40), to: address, value: '1000', isError: '0', txreceipt_status: '1', ...o,
})
const ok = (result: unknown[]) => Response.json({ status: '1', message: 'OK', result })
const empty = () => Response.json({ status: '0', message: 'No transactions found', result: [] })
const notok = (result: string | null, message = 'NOTOK') => Response.json({ status: '0', message, result })

/** fetch mock: answers by `action` in the URL. */
const mock = (by: Partial<Record<string, () => Response>>) => {
  const f = vi.fn(async (u: URL) => (by[u.searchParams.get('action')!] ?? empty)())
  vi.stubGlobal('fetch', f)
  return f
}
const urls = (f: ReturnType<typeof mock>) => f.mock.calls.map(([u]) => u)
afterEach(() => vi.unstubAllGlobals())

describe('POST /v1/history', () => {
  it('merges the three lists and calls Etherscan V2 for Sepolia with the USDC filter', async () => {
    const a = newAddress()
    const f = mock({
      txlist: () => ok([row(a, 100)]),
      txlistinternal: () => ok([row(a, 100, { traceId: '0_1', hash: hash(100) })]),
      tokentx: () => ok([row(a, 99, { contractAddress: USDC_SEPOLIA })]),
    })
    const r = await post({ address: a })
    expect(r.status).toBe(200)
    const body = HistoryResponse.parse(await r.json())
    expect(body.items.map((i) => i.kind)).toEqual(['native', 'internal', 'erc20'])
    expect(f).toHaveBeenCalledTimes(3)
    for (const u of urls(f)) {
      expect(u.origin + u.pathname).toBe('https://api.etherscan.io/v2/api')
      expect(u.searchParams.get('chainid')).toBe('11155111')
      expect(u.searchParams.get('sort')).toBe('desc')
      expect(u.searchParams.get('apikey')).toBe(KEY)
    }
    expect(urls(f).find((u) => u.searchParams.get('action') === 'tokentx')!.searchParams.get('contractaddress')).toBe(USDC_SEPOLIA)
    expect(JSON.stringify(body)).not.toContain(KEY)
  })

  it('serves the second identical request from the cache, and never puts the raw address in the cache key', async () => {
    const a = newAddress()
    const f = mock({ txlist: () => ok([row(a, 5)]) })
    const spy = vi.spyOn(caches.default, 'put')
    const first = await (await post({ address: a })).json()
    const second = await (await post({ address: a })).json()
    expect(second).toEqual(first)
    expect(f).toHaveBeenCalledTimes(3)
    const key = (spy.mock.calls[0]![0] as Request).url
    expect(key.toLowerCase()).not.toContain(a.slice(2).toLowerCase())
    spy.mockRestore()
  })

  it('401 without a token, no upstream call', async () => {
    const f = mock({})
    const r = await post({ address: newAddress() }, E, false)
    expect(r.status).toBe(401)
    expect(f).not.toHaveBeenCalled()
  })

  it('429 when the IP limiter says so', async () => {
    const f = mock({})
    const r = await post({ address: newAddress() }, { ...E, HISTORY_IP_LIMITER: { limit: async () => ({ success: false }) } })
    expect(r.status).toBe(429)
    expect(f).not.toHaveBeenCalled()
  })

  it.each([['short', '0x12'], ['no 0x', 'a'.repeat(40)], ['non hex', '0x' + 'g'.repeat(40)], ['missing', undefined]])('400 on a bad address (%s), no upstream call', async (_n, address) => {
    const f = mock({})
    const r = await post({ address })
    expect(r.status).toBe(400)
    expect(ErrorEnvelope.parse(await r.json())).toMatchObject({ code: 'invalid_request', retryable: false })
    expect(f).not.toHaveBeenCalled()
  })

  it('400 invalid_cursor (garbage, or from another address), no upstream call', async () => {
    const f = mock({ txlist: () => ok(Array.from({ length: 60 }, (_, i) => row(a1, 1000 - i))) })
    const a1 = newAddress()
    const page = HistoryResponse.parse(await (await post({ address: a1 })).json())
    f.mockClear()
    for (const [address, cursor] of [[a1, 'garbage'], [newAddress(), page.nextCursor!]] as const) {
      const r = await post({ address, cursor })
      expect(r.status).toBe(400)
      expect(ErrorEnvelope.parse(await r.json())).toEqual({ code: 'invalid_cursor', message: 'Invalid cursor', retryable: false })
    }
    expect(f).not.toHaveBeenCalled()
  })

  it('a valid cursor gives the next page (endblock = cursor block)', async () => {
    const a = newAddress()
    const all = Array.from({ length: 60 }, (_, i) => row(a, 1000 - i))
    const f = mock({ txlist: () => ok(all) })
    const p1 = HistoryResponse.parse(await (await post({ address: a })).json())
    expect(p1.items).toHaveLength(50)
    f.mockClear()
    const p2 = HistoryResponse.parse(await (await post({ address: a, cursor: p1.nextCursor })).json())
    expect(p2.items.map((i) => i.blockNumber)).toEqual(Array.from({ length: 10 }, (_, i) => 950 - i))
    expect(urls(f)[0]!.searchParams.get('endblock')).toBe('951')
  })

  it('500 and no upstream call when ETHERSCAN_API_KEY is missing', async () => {
    const f = mock({})
    for (const k of [undefined, '']) {
      const r = await post({ address: newAddress() }, { ...E, ETHERSCAN_API_KEY: k as never })
      expect(r.status).toBe(500)
      expect(await r.json()).toMatchObject({ code: 'internal' })
    }
    expect(f).not.toHaveBeenCalled()
  })

  it('empty history is a 200 with no items', async () => {
    mock({})
    const r = await post({ address: newAddress() })
    expect(await r.json()).toEqual({ items: [], nextCursor: null, incomplete: false })
  })
})

describe('Etherscan failures -> 503 retryable, nothing leaks', () => {
  const expect503 = async (r: Response) => {
    expect(r.status).toBe(503)
    const text = await r.text()
    expect(ErrorEnvelope.parse(JSON.parse(text))).toEqual({ code: 'unavailable', message: 'History unavailable', retryable: true })
    expect(text).not.toContain(KEY)
  }
  const logs = () => {
    const out: string[] = []
    for (const m of ['log', 'warn', 'error'] as const) vi.spyOn(console, m).mockImplementation((...a) => void out.push(a.join(' ')))
    return out
  }
  afterEach(() => vi.restoreAllMocks())

  it.each([
    ['Query Timeout', () => notok(null, 'Query Timeout occured. Please select a smaller result dataset')],
    ['invalid key', () => notok('Invalid API Key (#err2)')],
    ['window too large', () => notok(null, 'Result window is too large, PageNo x Offset size must be less than or equal to 10000')],
    ['http 500', () => new Response('boom ' + KEY, { status: 500 })],
    ['not json', () => new Response('<html>' + KEY + '</html>')],
    ['network error', () => { throw new TypeError('fetch failed ' + KEY) }],
  ])('%s', async (_n, res) => {
    const out = logs()
    mock({ txlist: res })
    await expect503(await post({ address: newAddress() }))
    expect(out.join('\n')).not.toContain(KEY)
    expect(out.join('\n')).not.toContain('etherscan.io')
  })

  it('a bad row in the answer', async () => {
    mock({ txlist: () => ok([{ hash: 'x' }]) })
    await expect503(await post({ address: newAddress() }))
  })

  it('rate limit message: one more try through the bucket, then success', async () => {
    let n = 0
    const out = logs()
    const a = newAddress()
    const f = mock({ txlist: () => (n++ === 0 ? notok('Max calls per sec rate limit reached (3/sec)') : ok([row(a, 7)])) })
    const r = await post({ address: a })
    expect(r.status).toBe(200)
    expect(f).toHaveBeenCalledTimes(4)
    expect(out.join('\n')).toContain('metric etherscan_429_total')
  })

  it('rate limit message twice -> 503', async () => {
    const f = mock({ txlist: () => notok('Max calls per sec rate limit reached (3/sec)') })
    await expect503(await post({ address: newAddress() }))
    expect(f.mock.calls.filter(([u]) => u.searchParams.get('action') === 'txlist')).toHaveLength(2)
  })

  it('no token within 2 s -> 503 without calling Etherscan', async () => {
    const f = mock({})
    const out = logs()
    await expect503(await post({ address: newAddress() }, { ...E, ETHERSCAN_BUCKET: grant(null) }))
    expect(f).not.toHaveBeenCalled()
    expect(out.join('\n')).toContain('metric etherscan_throttled_total')
  })

  it('waits for the bucket when it asks for a short wait', async () => {
    mock({})
    const t0 = Date.now()
    const r = await post({ address: newAddress() }, { ...E, ETHERSCAN_BUCKET: grant(60) })
    expect(r.status).toBe(200)
    expect(Date.now() - t0).toBeGreaterThanOrEqual(55)
  })
})
