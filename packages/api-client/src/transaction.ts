import { USDC_SEPOLIA } from '@vaultme/contracts'
import { toQuantity, type RpcCall } from './balances.ts'

/** One transaction as the web detail page shows it. Amounts are base units (wei, USDC 6 decimals). */
export type TxDetail = {
  hash: string
  from: string
  /** Null: a contract creation. */
  to: string | null
  asset: 'ETH' | 'USDC'
  amount: bigint
  /** False: the transaction reverted (it moved nothing but still paid the fee). */
  ok: boolean
  fee: bigint
  block: bigint
  /** ms since epoch (the block time). */
  at: number
}

const ADDRESS = /^0x[0-9a-fA-F]{40}$/
const TRANSFER_SELECTOR = '0xa9059cbb'
const TRANSFER_INPUT = new RegExp(`^${TRANSFER_SELECTOR}[0-9a-fA-F]{128}$`)

function object(v: unknown): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new Error('rpc: bad object')
  return v as Record<string, unknown>
}
function address(v: unknown): string {
  if (typeof v !== 'string' || !ADDRESS.test(v)) throw new Error('rpc: bad address')
  return v
}

/**
 * A transaction by hash (the web `/tx#0x…` page): `eth_getTransactionByHash`, `eth_getTransactionReceipt` and the block time.
 * Null = the chain has no such transaction, or it has no block yet (the page says "not in the history yet"). Throws on an answer
 * that does not fit, so a bad upstream is a failed load, not a wrong page. A call of `transfer(address,uint256)` on the Sepolia
 * USDC contract shows its arguments (a reverted one too: the call data is still there); any other call shows its ETH value.
 */
export async function readTransaction(rpc: RpcCall, hash: string): Promise<TxDetail | null> {
  const [tx, rc] = await Promise.all([
    rpc('eth_getTransactionByHash', [hash]),
    rpc('eth_getTransactionReceipt', [hash]),
  ])
  if (tx === null || rc === null) return null
  const t = object(tx)
  const r = object(rc)
  const block = toQuantity(r.blockNumber)
  const b = object(await rpc('eth_getBlockByNumber', [`0x${block.toString(16)}`, false]))

  const to = t.to === null ? null : address(t.to)
  const input = typeof t.input === 'string' ? t.input : ''
  const usdc = to?.toLowerCase() === USDC_SEPOLIA.toLowerCase() && TRANSFER_INPUT.test(input)
  return {
    hash,
    from: address(t.from),
    to: usdc ? `0x${input.slice(34, 74)}` : to,
    asset: usdc ? 'USDC' : 'ETH',
    amount: usdc ? BigInt(`0x${input.slice(74)}`) : toQuantity(t.value),
    ok: r.status === '0x1',
    fee: toQuantity(r.gasUsed) * toQuantity(r.effectiveGasPrice),
    block,
    at: Number(toQuantity(b.timestamp)) * 1000,
  }
}
