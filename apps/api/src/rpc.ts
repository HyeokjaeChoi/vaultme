import {
  BALANCE_OF_SELECTOR,
  RpcResponse,
  USDC_SEPOLIA,
  type RpcMethod,
  type RpcRequest,
  RPC_ALLOWED_METHODS,
} from '@vaultme/contracts'
import type { Env } from './env.ts'
import { logEvent } from './log.ts'

const UPSTREAM_TIMEOUT_MS = 5000
// #399: Infura's latency swings from run to run (staging upstream p50 12.5 to 94 ms, p95 64 to 735 ms). A read still open after this also
// goes to Alchemy. Near the warm upstream p50, so it adds a second call to roughly the slower half of reads. Tune from api-bench runs.
const HEDGE_MS = 100
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

/** A `null` result or a JSON-RPC error: from the hedge it may only lag (no receipt yet) or be a quota error, so it waits for Infura. */
const weak = (text: string): boolean => {
  const j = JSON.parse(text) as { result?: unknown; error?: unknown }
  return j.error !== undefined || j.result === null
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
    const parsed = RpcResponse.safeParse(JSON.parse(text))
    if (!parsed.success || !('result' in parsed.data || 'error' in parsed.data)) throw new Error('bad body')
    if (text.includes(u.key)) throw new Error('key echoed') // never pass a body that contains the key
    return text
  } catch (e) {
    if (!stop.aborted)
      logEvent(
        'error',
        'rpc_upstream_failed',
        e instanceof StatusError
          ? { upstream: u.name, status: e.status }
          : { upstream: u.name, error: e instanceof Error ? e.name : 'error' },
      )
    throw e
  }
}

/**
 * Sends the request to Infura; Alchemy gets it too when Infura fails, or (reads only) when Infura has not answered in HEDGE_MS.
 * Returns the first valid upstream JSON text, or null when both failed. A hedged `null` or error answer does not win while Infura may
 * still answer (Alchemy can be a block behind); it is used only when Infura fails. Falls back on network error, timeout and non-2xx (5xx, 429,
 * bad key). A JSON-RPC error inside a 200 is a real answer and is returned as is.
 * `hedge: false` (background work, push.ts) keeps the plain fallback. eth_sendRawTransaction is never hedged: a second node would answer "already known" for a send that worked, and that error could win.
 * After a failure it is safe to resend: the same raw tx has the same hash.
 * Never log the URL, the error text or the upstream body: they can carry the API key.
 */
export async function proxyRpc(env: Env['Bindings'], req: RpcRequest, hedge = true): Promise<string | null> {
  const body = JSON.stringify(req)
  const [primary, backup] = upstreams(env)
  const stop = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const hedgeTimer = { fired: false } // set inside the timer callback
  const first = ask(primary, body, stop.signal)
  const second = new Promise<string>((resolve, reject) => {
    let started = false
    const go = () => {
      if (started) return
      started = true
      clearTimeout(timer)
      ask(backup, body, stop.signal).then(resolve, reject)
    }
    first.catch(go)
    if (hedge && req.method !== 'eth_sendRawTransaction')
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
    return win.text
  } catch {
    return null
  } finally {
    clearTimeout(timer)
    stop.abort() // cancels the slower call, if any
  }
}
