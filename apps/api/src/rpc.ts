import {
  BALANCE_OF_SELECTOR,
  RpcResponse,
  USDC_SEPOLIA,
  type RpcMethod,
  type RpcRequest,
  RPC_ALLOWED_METHODS,
} from '@vaultme/contracts'
import type { Env } from './env.ts'
import { infuraDailyCap } from './alerts.ts'
import { logEvent } from './log.ts'
import { recordRpc } from './metrics.ts'

const UPSTREAM_TIMEOUT_MS = 5000
// #399: Infura's latency swings from run to run (staging upstream p50 12.5 to 94 ms, p95 64 to 735 ms). A read still open after this also
// goes to Alchemy. 100 ms left warm rpc p95 at 166.73 to 206.64 ms (SLO 200, api-bench 2026-11-04): the slowest reads took the delay
// plus Alchemy's time. 60 ms hedges more reads (a second call) to cut that tail. Tune from api-bench runs.
const HEDGE_MS = 60
// A spent quota is a failure of that upstream, not an answer: the other upstream is tried (API-1). Infura sends HTTP 402 with a JSON-RPC
// error body (`code` 402, `event` -33000) for a spent daily cap, and `code` 429 / `event` -33200 for a spent throughput; its docs give no HTTP
// status for the second, so it may arrive inside a 200 (docs.infura.io/how-to/avoid-rate-limiting, read 2026-11-15). -32005 is the EIP-1474
// "limit exceeded". Both `code` and `event` are matched. Cost of a false positive: a node that sends one of these for another reason costs one
// more call, and when both upstreams do, the user gets a 503 instead of the node's error. Calls stay at two per request and clients never retry.
const QUOTA_CODES: ReadonlySet<number> = new Set([-32005, 402, 429, -33000, -33200])
// Never hedged: a send (a second node would answer "already known" for a send that worked, and that error could win) and the nonce read
// (Alchemy can lag Infura; a lagging nonce is a real number, so it would win the hedge and the next send would fail with "nonce too low", CHAIN-4).
const NEVER_HEDGED: ReadonlySet<string> = new Set(['eth_sendRawTransaction', 'eth_getTransactionCount'])
const ARG_32_BYTES = new RegExp(`^${BALANCE_OF_SELECTOR}[0-9a-fA-F]{64}$`)

const TX_HASH = /^0x[0-9a-fA-F]{64}$/
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Allow-list check (ARCHITECTURE.md#api-contract). Cheap to be strict: anything unexpected is refused. */
export function rpcAllowed({ method, params = [] }: RpcRequest): boolean {
  if (!(RPC_ALLOWED_METHODS as readonly string[]).includes(method)) return false
  switch (method as RpcMethod) {
    case 'eth_call': {
      // Only USDC balanceOf(address). No `input` alias, no state override (3rd param).
      const [tx, , ...rest] = params
      if (!isObject(tx) || rest.length > 0 || 'input' in tx) return false
      const { to, data } = tx
      return (
        typeof to === 'string' &&
        to.toLowerCase() === USDC_SEPOLIA.toLowerCase() &&
        typeof data === 'string' &&
        ARG_32_BYTES.test(data)
      )
    }
    // Full transaction objects would make the response huge.
    case 'eth_getBlockByNumber':
      return params[1] === false
    // One 32-byte hash and nothing else.
    case 'eth_getTransactionByHash':
      return params.length === 1 && typeof params[0] === 'string' && TX_HASH.test(params[0])
    default:
      return true
  }
}

const upstreams = (env: Env['Bindings']) => {
  // Fail closed (500) when a key is missing.
  for (const k of [env.INFURA_KEY, env.ALCHEMY_KEY])
    if (typeof k !== 'string' || k.length === 0) throw new Error('invalid RPC key')
  return [
    { name: 'infura', key: env.INFURA_KEY, url: `https://sepolia.infura.io/v3/${encodeURIComponent(env.INFURA_KEY)}` },
    {
      name: 'alchemy',
      key: env.ALCHEMY_KEY,
      url: `https://eth-sepolia.g.alchemy.com/v2/${encodeURIComponent(env.ALCHEMY_KEY)}`,
    },
  ] as const
}

class StatusError extends Error {
  readonly status: number
  constructor(status: number) {
    super('upstream status')
    this.status = status
  }
}

/** The quota marker of a JSON-RPC error body: its `code` or Infura's `event`, whichever is in QUOTA_CODES. */
const quotaMarker = (json: unknown): number | undefined => {
  const e = isObject(json) ? json.error : undefined
  if (!isObject(e)) return undefined
  return [e.code, e.event].find((v): v is number => typeof v === 'number' && QUOTA_CODES.has(v))
}

/** The upstream answered 200 with a JSON-RPC error that says its quota is spent (QUOTA_CODES). */
class QuotaError extends Error {
  readonly code: number
  /** The body names Infura's daily cap (`code` 402 or `event` -33000), whichever of the two markers was found first. */
  readonly dailyCap: boolean
  constructor(code: number, dailyCap: boolean) {
    super('upstream quota')
    this.code = code
    this.dailyCap = dailyCap
  }
}

/** A `null` result or a JSON-RPC error (not a quota error: `ask` rejects that): from the hedge it may only lag (no receipt yet) or be one node's own error, so it waits for Infura. */
const weak = (text: string): boolean => {
  const j = JSON.parse(text) as { result?: unknown; error?: unknown }
  return j.error !== undefined || j.result === null
}

/** Infura's daily cap: HTTP 402, or `code` 402 / `event` -33000 inside a 200. Its throughput limit (429, -33200) refills in seconds and is no alert. */
const isDailyCap = (e: unknown): boolean =>
  (e instanceof StatusError && e.status === 402) || (e instanceof QuotaError && e.dailyCap)

/** The error object of a JSON-RPC body names the daily cap in `code` or in `event`, not only in the first marker `quotaMarker` finds. */
const namesDailyCap = (json: unknown): boolean => {
  const e = isObject(json) ? json.error : undefined
  return isObject(e) && [e.code, e.event].some((v) => v === 402 || v === -33000)
}

type Upstream = ReturnType<typeof upstreams>[number]

/** One upstream call. Resolves with the JSON text, throws on any failure. A call the hedge cancelled (`stop`) is not logged as failed. */
async function ask(u: Upstream, body: string, stop: AbortSignal): Promise<string> {
  try {
    const res = await fetch(u.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      signal: AbortSignal.any([stop, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)]),
    })
    if (!res.ok) throw new StatusError(res.status)
    const text = await res.text()
    // Not a JSON-RPC response (HTML error page, array, no result/error) counts as a failure.
    const json: unknown = JSON.parse(text)
    const parsed = RpcResponse.safeParse(json)
    if (!parsed.success || !('result' in parsed.data || 'error' in parsed.data)) throw new Error('bad body')
    if (text.includes(u.key)) throw new Error('key echoed') // never pass a body that contains the key
    const quota = quotaMarker(json)
    if (quota !== undefined) throw new QuotaError(quota, namesDailyCap(json))
    return text
  } catch (e) {
    if (u.name === 'infura' && isDailyCap(e)) infuraDailyCap()
    if (!stop.aborted)
      logEvent(
        'error',
        'rpc_upstream_failed',
        e instanceof StatusError
          ? { upstream: u.name, status: e.status }
          : e instanceof QuotaError
            ? { upstream: u.name, quota: e.code }
            : { upstream: u.name, error: e instanceof Error ? e.name : 'error' },
      )
    throw e
  }
}

/**
 * Sends the request to Infura; Alchemy gets it too when Infura fails, or (reads only) when Infura has not answered in HEDGE_MS.
 * Returns the first valid upstream JSON text, or null when both failed. A hedged `null` or error answer does not win while Infura may
 * still answer (Alchemy can be a block behind); it is used only when Infura fails. Falls back on network error, timeout, non-2xx (5xx, 429,
 * 402, bad key), a body that is not a JSON-RPC answer and a quota error inside a 200 (QUOTA_CODES). Any other JSON-RPC error inside a 200 is a
 * real answer and is returned as is.
 * `hedge: false` (background work, push.ts) keeps the plain fallback and writes no data point: one webhook or cron run makes hundreds of calls and
 * a Worker invocation may write 250 points at most. A public request (`hedge` true) writes one (API-4). NEVER_HEDGED methods are sent to Alchemy only after Infura failed.
 * After a failure it is safe to resend: the same raw tx has the same hash.
 * Never log the URL, the error text or the upstream body: they can carry the API key.
 */
export async function proxyRpc(env: Env['Bindings'], req: RpcRequest, hedge = true): Promise<string | null> {
  const body = JSON.stringify(req)
  const [primary, backup] = upstreams(env)
  const t0 = Date.now()
  let backupCalls = 0
  const stop = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const hedgeTimer = { fired: false } // set inside the timer callback
  const first = ask(primary, body, stop.signal)
  const second = new Promise<string>((resolve, reject) => {
    let started = false
    const go = () => {
      if (started) return
      started = true
      backupCalls = 1
      clearTimeout(timer)
      ask(backup, body, stop.signal).then(resolve, reject)
    }
    first.catch(go)
    if (hedge && !NEVER_HEDGED.has(req.method))
      timer = setTimeout(() => {
        hedgeTimer.fired = true
        go()
      }, HEDGE_MS)
  })
  const fromBackup = second.then((t) => (weak(t) ? first.catch(() => t) : t))
  try {
    const win = await Promise.any([
      first.then((text) => ({ text, upstream: primary.name })),
      fromBackup.then((text) => ({ text, upstream: backup.name })),
    ])
    // A slow or hung Infura leaves no failure log when Alchemy wins (its call is aborted), so the hedge logs which side answered.
    if (hedgeTimer.fired) logEvent('info', 'rpc_hedged', { upstream: win.upstream })
    if (hedge) recordRpc(env, req.method, 'ok', win.upstream, hedgeTimer.fired, Date.now() - t0, 1, backupCalls)
    return win.text
  } catch {
    if (hedge) recordRpc(env, req.method, 'unavailable', 'none', hedgeTimer.fired, Date.now() - t0, 1, backupCalls)
    return null
  } finally {
    clearTimeout(timer)
    stop.abort() // cancels the slower call, if any
  }
}
