import { BALANCE_OF_SELECTOR, USDC_SEPOLIA } from '@vaultme/contracts'

/** `POST /v1/rpc` as a function: returns the JSON-RPC `result`, throws on error. */
export type RpcCall = (method: string, params: unknown[]) => Promise<unknown>

/** A JSON-RPC quantity (`0x…`) as a bigint. */
export function toQuantity(v: unknown): bigint {
  if (typeof v !== 'string' || !/^0x[0-9a-fA-F]+$/.test(v)) throw new Error('rpc: bad quantity')
  return BigInt(v)
}

/** A 32-byte ABI word of a hex value (address or number). */
export const abiWord = (hex: string) => hex.replace(/^0x/, '').toLowerCase().padStart(64, '0')

export const readEthBalance = async (rpc: RpcCall, address: string) =>
  toQuantity(await rpc('eth_getBalance', [address, 'latest']))

export const readUsdcBalance = async (rpc: RpcCall, address: string) =>
  toQuantity(await rpc('eth_call', [{ to: USDC_SEPOLIA, data: `${BALANCE_OF_SELECTOR}${abiWord(address)}` }, 'latest']))

/** ETH and Sepolia USDC balances in base units (wei, USDC 6 decimals). Mobile Home and the web viewer. */
export async function readBalances(rpc: RpcCall, address: string): Promise<{ ETH: bigint; USDC: bigint }> {
  const [ETH, USDC] = await Promise.all([readEthBalance(rpc, address), readUsdcBalance(rpc, address)])
  return { ETH, USDC }
}
