import {
  BALANCE_OF_SELECTOR,
  RpcResponse,
  USDC_SEPOLIA,
  type RpcMethod,
  type RpcRequest,
  RPC_ALLOWED_METHODS,
} from '@vaultme/contracts'
import type { Env } from './env.ts'

const UPSTREAM_TIMEOUT_MS = 5000
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
  ]
}

/**
 * Sends the request to Infura, then Alchemy. Returns the upstream JSON text, or null when both failed.
 * Falls back on network error, timeout and non-2xx (5xx, 429, bad key). A JSON-RPC error inside a 200 is a real
 * answer and is returned as is. eth_sendRawTransaction is safe to resend: the same raw tx has the same hash,
 * so a second send is "already known" at worst.
 * Never log the URL, the error text or the upstream body: they can carry the API key.
 */
export async function proxyRpc(env: Env['Bindings'], req: RpcRequest): Promise<string | null> {
  const body = JSON.stringify(req)
  for (const u of upstreams(env)) {
    try {
      const res = await fetch(u.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      })
      if (!res.ok) {
        console.error('rpc upstream failed', u.name, res.status)
        continue
      }
      const text = await res.text()
      // Not a JSON-RPC response (HTML error page, array, no result/error) counts as a failure.
      const parsed = RpcResponse.safeParse(JSON.parse(text))
      if (!parsed.success || !('result' in parsed.data || 'error' in parsed.data)) throw new Error('bad body')
      if (text.includes(u.key)) throw new Error('key echoed') // never pass a body that contains the key
      return text
    } catch (e) {
      console.error('rpc upstream failed', u.name, e instanceof Error ? e.name : 'error')
    }
  }
  return null
}
