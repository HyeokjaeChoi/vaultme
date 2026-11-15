import { RpcError, type RpcCall } from '@vaultme/api-client'
import { RPC_ALLOWED_METHODS } from '@vaultme/contracts'

// apps/api/test-reorg uses 18545: both suites may run at once on one machine.
export const ANVIL_PORT = 18546

/** One JSON-RPC call to anvil. A JSON-RPC error becomes an `RpcError`, as it does through the API client. */
export async function admin(method: string, params: unknown[] = []): Promise<unknown> {
  const res = await fetch(`http://127.0.0.1:${String(ANVIL_PORT)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  const j = (await res.json()) as { result?: unknown; error?: { code: number; message: string } }
  if (j.error) throw new RpcError(j.error.code, j.error.message)
  return j.result
}

const ALLOWED = new Set<string>(RPC_ALLOWED_METHODS)
/** What the app can ask: `/v1/rpc` answers only its allow-list, so a method outside it fails here like it fails in production. */
export const appRpc: RpcCall = (method, params) =>
  ALLOWED.has(method) ? admin(method, params) : Promise.reject(new Error(`not allowed through /v1/rpc: ${method}`))

/** Mines `n` empty-or-pool blocks. With `--no-mining` this is the only way a block appears. */
export const mine = async (n = 1): Promise<void> => {
  await admin('anvil_mine', [`0x${n.toString(16)}`])
}
