import { USDC_SEPOLIA, type HistoryResponse } from '@vaultme/contracts'
import type { Env } from './env.ts'
import { UpstreamError } from './errors.ts'
import { addressHash, checkCursor, loadHistory, type FetchList } from './history.ts'

const BASE = 'https://api.etherscan.io/v2/api'
const SEPOLIA = '11155111'
const TIMEOUT_MS = 8000
const CACHE_SECONDS = 30
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Bindings = Env['Bindings']

/** Waits for a token of the global bucket. Throws when the wait would be over 2 s. */
async function acquire(env: Bindings): Promise<void> {
  const wait = await env.ETHERSCAN_BUCKET.getByName('global').acquire()
  if (wait === null) {
    console.warn('metric etherscan_throttled_total')
    throw new UpstreamError('throttled')
  }
  if (wait > 0) await sleep(wait)
}

/**
 * One Etherscan list call. HTTP is always 200: the answer is in `status`/`message`/`result`.
 * Empty -> []. Rate limit -> one more try through the bucket, then 503. Query Timeout and the rest -> 503.
 * Never log or throw the URL, the key or the body: they can carry the key.
 */
function etherscanList(env: Bindings, address: string): FetchList {
  const key = env.ETHERSCAN_API_KEY
  if (typeof key !== 'string' || key.length === 0) throw new Error('invalid ETHERSCAN_API_KEY') // fail closed (500)
  return async (list, q) => {
    const url = new URL(BASE)
    const params: Record<string, string> = {
      chainid: SEPOLIA,
      module: 'account',
      action: list,
      address,
      sort: 'desc',
      page: String(q.page),
      offset: String(q.offset),
      apikey: key,
    }
    if (q.endblock !== undefined) params.endblock = String(q.endblock)
    if (list === 'tokentx') params.contractaddress = USDC_SEPOLIA
    url.search = new URLSearchParams(params).toString()
    for (let attempt = 0; attempt < 2; attempt++) {
      await acquire(env)
      const t0 = Date.now()
      let body: { status?: unknown; message?: unknown; result?: unknown }
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
        if (!res.ok) throw new Error(`http ${String(res.status)}`)
        const json: unknown = await res.json()
        if (typeof json !== 'object' || json === null || Array.isArray(json)) throw new Error('not an object')
        body = json
      } catch (e) {
        console.error('etherscan request failed', list, e instanceof Error ? e.name : 'error')
        throw new UpstreamError('request failed')
      }
      if (body.status === '1' && Array.isArray(body.result)) {
        console.log('etherscan ok', list, Date.now() - t0) // latency of successful calls only
        const rows: unknown[] = body.result
        return rows
      }
      if (body.message === 'No transactions found') return []
      if (typeof body.result === 'string' && /rate limit/i.test(body.result)) {
        console.warn('metric etherscan_429_total')
        continue
      }
      // Query Timeout, bad key, window too large, ...: only the message, never the body.
      console.error('etherscan error', list, typeof body.message === 'string' ? body.message.slice(0, 60) : '?')
      throw new UpstreamError('upstream error')
    }
    throw new UpstreamError('rate limited')
  }
}

/** Cache API, 30 s per (address hash, cursor). The raw address is never part of the key. */
export async function getHistory(env: Bindings, address: string, cursor: string | undefined): Promise<HistoryResponse> {
  const fetchList = etherscanList(env, address)
  await checkCursor(address, cursor) // before the cache: a bad cursor must never get a cached 200
  const cache = caches.default
  const cacheKey = new Request(
    `https://history.vaultme.invalid/${await addressHash(address)}/${cursor === undefined ? 'first' : `c/${cursor}`}`,
  )
  const hit = await cache.match(cacheKey)
  if (hit) return await hit.json<HistoryResponse>()
  const out = await loadHistory(fetchList, address, cursor)
  await cache.put(cacheKey, Response.json(out, { headers: { 'Cache-Control': `max-age=${String(CACHE_SECONDS)}` } }))
  return out
}
