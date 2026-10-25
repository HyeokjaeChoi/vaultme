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
  /** False: the transaction reverted (it moved nothing but still paid the fee). `amount` stays the amount the call named. */
  ok: boolean
  fee: bigint
  block: bigint
  /** ms since epoch (the block time). */
  at: number
}

const ADDRESS = /^0x[0-9a-fA-F]{40}$/
const TRANSFER_SELECTOR = '0xa9059cbb'
// An ABI decoder ignores bytes after the two arguments, so they are not required to end there.
const TRANSFER_INPUT = new RegExp(`^${TRANSFER_SELECTOR}[0-9a-fA-F]{128}`)
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

function object(v: unknown): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new Error('rpc: bad object')
  return v as Record<string, unknown>
}
function address(v: unknown): string {
  if (typeof v !== 'string' || !ADDRESS.test(v)) throw new Error('rpc: bad address')
  return v
}

/** The one Sepolia USDC `Transfer` log of a receipt (a `transferFrom`, a router, a Safe), or null when there is none or more than one. */
function usdcLeg(logs: unknown): { from: string; to: string; amount: bigint } | null {
  if (!Array.isArray(logs)) return null
  const legs = logs
    .map(object)
    .filter(
      (l) =>
        typeof l.address === 'string' &&
        l.address.toLowerCase() === USDC_SEPOLIA.toLowerCase() &&
        Array.isArray(l.topics) &&
        l.topics.length === 3 &&
        l.topics[0] === TRANSFER_TOPIC,
    )
  const [leg, ...more] = legs
  if (!leg || more.length > 0) return null
  const [, from = '', to = ''] = leg.topics as string[]
  return { from: `0x${from.slice(-40)}`, to: `0x${to.slice(-40)}`, amount: toQuantity(leg.data) }
}

/**
 * A transaction by hash (the web `/tx#0x…` page): `eth_getTransactionByHash`, `eth_getTransactionReceipt` and the block time.
 * Null = the chain has no such transaction, or it has no block yet (the page says "not in the history yet"). Throws on an answer
 * that does not fit, so a bad upstream is a failed load, not a wrong page. A call of `transfer(address,uint256)` on the Sepolia
 * USDC contract shows its arguments (a reverted one too: the call data is still there); another call that emits exactly one Sepolia
 * USDC `Transfer` shows that move; anything else shows the call's own ETH value (an ETH move made inside a contract is not shown).
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
  const answer = await rpc('eth_getBlockByNumber', [`0x${block.toString(16)}`, false])
  if (answer === null) return null // a node that is behind the one that has the receipt: the same wait as no receipt
  const b = object(answer)

  const to = t.to === null ? null : address(t.to)
  const input = typeof t.input === 'string' ? t.input : ''
  const usdc = to?.toLowerCase() === USDC_SEPOLIA.toLowerCase() && TRANSFER_INPUT.test(input)
  const leg = usdc ? null : usdcLeg(r.logs)
  return {
    hash,
    from: leg ? leg.from : address(t.from),
    to: usdc ? `0x${input.slice(34, 74)}` : leg ? leg.to : to,
    asset: usdc || leg ? 'USDC' : 'ETH',
    amount: usdc ? BigInt(`0x${input.slice(74, 138)}`) : leg ? leg.amount : toQuantity(t.value),
    ok: r.status === '0x1',
    fee: toQuantity(r.gasUsed) * toQuantity(r.effectiveGasPrice),
    block,
    at: Number(toQuantity(b.timestamp)) * 1000,
  }
}
