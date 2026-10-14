import type { Address, Hash } from '@vaultme/wallet-core'
import type { ChainPort, Receipt } from '@/shared/chain/port'
import type { PendingTx } from '@/shared/storage'

export type TxState = PendingTx['state']

/** Final states: nothing changes them, so nothing re-checks them. */
export const isFinal = (s: TxState): boolean => s === 'Confirmed' || s === 'Failed' || s === 'Replaced'
/** States that can still move on their own (hld.md §4.1). Unknown only moves on a manual re-check. */
export const isPolled = (s: TxState): boolean => s === 'Pending' || s === 'Included'

type Facts = {
  current: TxState
  nonce: number
  /** null = no receipt for our hash. */
  receipt: Receipt | null
  safeBlock: bigint | null
  safeNonce: bigint | null
}

/**
 * hld.md §4.1 / lld.md §6. A receipt at or below the `safe` block is final: success = Confirmed, reverted = Failed (Q37).
 * A receipt above it is Included, whether it succeeded or not. No receipt: Included falls back to Pending (reorg);
 * an account nonce at `safe` beyond ours means another tx took the nonce = Replaced (Q77). Nothing else changes the state,
 * and never the passing of time (Q22).
 */
export function deriveState(f: Facts): TxState {
  if (isFinal(f.current)) return f.current
  if (f.receipt) {
    if (f.safeBlock === null || f.receipt.blockNumber > f.safeBlock) return 'Included'
    return f.receipt.status === 'success' ? 'Confirmed' : 'Failed'
  }
  if (f.safeNonce !== null && f.safeNonce > BigInt(f.nonce)) return 'Replaced'
  return f.current === 'Included' ? 'Pending' : f.current
}

/**
 * One status check (S41 "상태 다시 확인", the 15 s poll). Throws when the network could not be asked: the caller keeps the old record.
 * The fake adapter sent nothing, so it only refreshes the checked time.
 */
export async function checkTx(tx: PendingTx, chain: Pick<ChainPort, 'broadcasts' | 'getReceipt' | 'getSafeBlock' | 'getSafeNonce'>, from: Address, now: () => number): Promise<PendingTx> {
  if (!chain.broadcasts || isFinal(tx.state)) return { ...tx, lastCheckedAt: now() }
  const receipt = await chain.getReceipt(tx.hash as Hash)
  const [safeBlock, safeNonce] = receipt ? [await chain.getSafeBlock(), null] : [null, await chain.getSafeNonce(from)]
  const state = deriveState({ current: tx.state, nonce: tx.nonce, receipt, safeBlock, safeNonce })
  return { ...tx, state, lastCheckedAt: now() }
}

export type PollTimers = { set: (fn: () => void, ms: number) => unknown; clear: (h: unknown) => void }
const realTimers: PollTimers = { set: (fn, ms) => setTimeout(fn, ms), clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>) }

/**
 * Runs `check` now and then `intervalMs` after each run finishes (no overlap). Stops by itself once `check` reports a state that is
 * not polled (final, or Unknown); a failed check is retried on the next tick. Returns `stop` (screen blur, app in background).
 */
export function startPolling(check: () => Promise<TxState | null>, intervalMs: number, timers: PollTimers = realTimers): () => void {
  let stopped = false
  let handle: unknown
  const tick = async () => {
    let next: TxState | null = null
    try {
      next = await check()
    } catch {
      // keep polling: the network may come back
    }
    if (stopped || (next !== null && !isPolled(next))) return
    handle = timers.set(() => void tick(), intervalMs)
  }
  void tick()
  return () => {
    stopped = true
    timers.clear(handle)
  }
}
