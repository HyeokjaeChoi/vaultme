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
  /** Index in `receipts` of the cancel tx (the last hash while the record's kind is cancel); absent or null = no cancel (ADR-0031). */
  cancelIndex?: number | null
}

/** Index of the own hash that has a receipt (the one the network ran), null when none has. */
export const minedIndex = (receipts: readonly (TxReceipt | null)[]): number | null => {
  const i = receipts.findIndex((r) => r !== null)
  return i < 0 ? null : i
}

/** Final states: nothing changes them, so nothing re-checks them. */
export const isFinal = (s: TxStatus): boolean => s === 'Confirmed' || s === 'Failed' || s === 'Replaced'
/** States that can still move on their own (ARCHITECTURE.md#invariants). Unknown only moves on a manual re-check. */
export const isPolled = (s: TxStatus): boolean => s === 'Pending' || s === 'Included'

/**
 * ARCHITECTURE.md#invariants (transaction state). A receipt for ANY own hash decides (ADR-0031: the network runs one of the txs that share the nonce). A receipt at or below the `safe` block is final: success = Confirmed, reverted = Failed (ADR-0006).
 * A receipt above it is Included, whether it succeeded or not. No receipt: Included falls back to Pending (reorg);
 * an account nonce at `safe` beyond ours means another tx took the nonce = Replaced (ADR-0006). Nothing else changes the state,
 * and never the passing of time (ADR-0006). A mined cancel (`cancelIndex`) is Replaced once its receipt is at or below `safe`; above it the state stays Pending, so no cancel is claimed before it is final (ADR-0031).
 */
export function deriveState(f: TxFacts): TxStatus {
  if (isFinal(f.current)) return f.current
  const i = minedIndex(f.receipts)
  const receipt = i === null ? null : (f.receipts[i] ?? null)
  if (receipt) {
    const cancel = f.cancelIndex === i
    if (f.safeBlock === null || receipt.blockNumber > f.safeBlock) return cancel ? 'Pending' : 'Included'
    if (cancel) return 'Replaced'
    return receipt.status === 'success' ? 'Confirmed' : 'Failed'
  }
  if (f.safeNonce !== null && f.safeNonce > BigInt(f.nonce)) return 'Replaced'
  return f.current === 'Included' ? 'Pending' : f.current
}
