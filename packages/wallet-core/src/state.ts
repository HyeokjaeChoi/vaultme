/** Status of a sent transaction (ARCHITECTURE.md#invariants, ADR-0006). Derived from chain facts, never stored as events (ADR-0021). */
export type TxStatus = 'Pending' | 'Unknown' | 'Included' | 'Confirmed' | 'Failed' | 'Replaced'

export type TxReceipt = { status: 'success' | 'reverted'; blockNumber: bigint }

export type TxFacts = {
  current: TxStatus
  nonce: number
  /** One entry per own hash of the send (original first, then each replacement, ADR-0031): null = no receipt for that hash. */
  receipts: readonly (TxReceipt | null)[]
  safeBlock: bigint | null
  safeNonce: bigint | null
}

/** Final states: nothing changes them, so nothing re-checks them. */
export const isFinal = (s: TxStatus): boolean => s === 'Confirmed' || s === 'Failed' || s === 'Replaced'
/** States that can still move on their own (ARCHITECTURE.md#invariants). Unknown only moves on a manual re-check. */
export const isPolled = (s: TxStatus): boolean => s === 'Pending' || s === 'Included'

/**
 * ARCHITECTURE.md#invariants (transaction state). A receipt for ANY own hash decides (ADR-0031: the network runs one of the txs that share the nonce). A receipt at or below the `safe` block is final: success = Confirmed, reverted = Failed (ADR-0006).
 * A receipt above it is Included, whether it succeeded or not. No receipt: Included falls back to Pending (reorg);
 * an account nonce at `safe` beyond ours means another tx took the nonce = Replaced (ADR-0006). Nothing else changes the state,
 * and never the passing of time (ADR-0006).
 */
export function deriveState(f: TxFacts): TxStatus {
  if (isFinal(f.current)) return f.current
  const receipt = f.receipts.find((r) => r !== null) ?? null
  if (receipt) {
    if (f.safeBlock === null || receipt.blockNumber > f.safeBlock) return 'Included'
    return receipt.status === 'success' ? 'Confirmed' : 'Failed'
  }
  if (f.safeNonce !== null && f.safeNonce > BigInt(f.nonce)) return 'Replaced'
  return f.current === 'Included' ? 'Pending' : f.current
}
