import type { Address, Hash } from '@vaultme/wallet-core'
import type { ChainPort, Receipt } from '@/shared/chain/port'
import type { PendingTx } from '@/shared/storage'

export type TxState = PendingTx['state']

/** Final states: nothing changes them, so nothing re-checks them. */
export const isFinal = (s: TxState): boolean => s === 'Confirmed' || s === 'Failed' || s === 'Replaced'
/** States that can still move on their own (ARCHITECTURE.md#invariants). Unknown only moves on a manual re-check. */
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
 * ARCHITECTURE.md#invariants (transaction state). A receipt at or below the `safe` block is final: success = Confirmed, reverted = Failed (ADR-0006).
 * A receipt above it is Included, whether it succeeded or not. No receipt: Included falls back to Pending (reorg);
 * an account nonce at `safe` beyond ours means another tx took the nonce = Replaced (ADR-0006). Nothing else changes the state,
 * and never the passing of time (ADR-0006).
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

/** Test-data mode: how long a fake send stays Pending before the fake adapter settles it as Confirmed (issue #64 decision 14). */
export const FAKE_SETTLE_MS = 6_000
/** Block number shown for a fake send once it settles (test data, like the Figma S41 example). */
const FAKE_BLOCK = 5_812_044

/** The fake adapter sent nothing: a Pending send settles as Confirmed `FAKE_SETTLE_MS` after it was created. Any other state stays as it is. Pure: the clock comes in. */
export function fakeSettle(tx: PendingTx, now: number): PendingTx {
  if (tx.state !== 'Pending') return { ...tx, lastCheckedAt: now }
  return now - tx.createdAt >= FAKE_SETTLE_MS
    ? { ...tx, state: 'Confirmed', blockNumber: FAKE_BLOCK, lastCheckedAt: now }
    : { ...tx, lastCheckedAt: now }
}

/**
 * One status check (S41 "상태 다시 확인", the 15 s poll). Throws when the network could not be asked: the caller keeps the old record.
 * The fake adapter sent nothing: it settles a Pending send after `FAKE_SETTLE_MS` (`fakeSettle`).
 */
export async function checkTx(
  tx: PendingTx,
  chain: Pick<ChainPort, 'broadcasts' | 'getReceipt' | 'getSafeBlock' | 'getSafeNonce'>,
  from: Address,
  now: () => number,
): Promise<PendingTx> {
  if (!chain.broadcasts) return fakeSettle(tx, now())
  if (isFinal(tx.state)) return { ...tx, lastCheckedAt: now() }
  const receipt = await chain.getReceipt(tx.hash as Hash)
  const [safeBlock, safeNonce] = receipt ? [await chain.getSafeBlock(), null] : [null, await chain.getSafeNonce(from)]
  const state = deriveState({ current: tx.state, nonce: tx.nonce, receipt, safeBlock, safeNonce })
  return { ...tx, state, lastCheckedAt: now(), ...(receipt ? { blockNumber: Number(receipt.blockNumber) } : {}) }
}

export type PollTimers = { set: (fn: () => void, ms: number) => unknown; clear: (h: unknown) => void }
const realTimers: PollTimers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
}

/**
 * Runs `check` now and then `intervalMs` after each run finishes (no overlap). Stops by itself once `check` reports a state that is
 * not polled (final, or Unknown); a failed check is retried on the next tick. Returns `stop` (screen blur, app in background).
 */
export function startPolling(
  check: () => Promise<TxState | null>,
  intervalMs: number,
  timers: PollTimers = realTimers,
): () => void {
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
