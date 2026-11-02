import { deriveState, isFinal, isPolled, type Address, type Hash } from '@vaultme/wallet-core'
import type { ChainPort, Receipt } from '@/shared/chain'
import { ownHashes } from './hashes'
import type { PendingTx } from '@/shared/storage'

// The derivation lives in wallet-core (Q59, ADR-0021); the app keeps the network check and the fake adapter.
export { isFinal, isPolled }

export type TxState = PendingTx['state']

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

/** What the network said about one send (ADR-0006 inputs of `deriveState`). Facts only: the stored record is not touched. */
/** `receipts[i]` belongs to `hashes[i]` (ADR-0031: one entry per own hash). */
export type TxFacts = {
  hashes: string[]
  receipts: (Receipt | null)[]
  safeBlock: bigint | null
  safeNonce: bigint | null
}

type FactsChain = Pick<ChainPort, 'getReceipt' | 'getSafeBlock' | 'getSafeNonce'>

/** Whether a check of this send asks the network: not in test-data mode (nothing was sent), not once final. */
export const needsFacts = (tx: PendingTx, broadcasts: boolean): boolean => broadcasts && !isFinal(tx.state)

/** The network reads of one status check. Throws when the network could not be asked. */
export async function fetchTxFacts(
  tx: Pick<PendingTx, 'hash' | 'hashes'>,
  chain: FactsChain,
  from: Address,
): Promise<TxFacts> {
  const hashes = ownHashes(tx)
  const receipts = await Promise.all(hashes.map((h) => chain.getReceipt(h as Hash)))
  const mined = receipts.some((r) => r !== null)
  const [safeBlock, safeNonce] = mined ? [await chain.getSafeBlock(), null] : [null, await chain.getSafeNonce(from)]
  return { hashes, receipts, safeBlock, safeNonce }
}

/**
 * The new record of a check: `deriveState` over the facts (wallet-core), nothing else, so time alone never moves a state (ADR-0006).
 * `facts` null = nothing was asked (test-data mode, or a final send): only `lastCheckedAt` moves, and the fake adapter settles a Pending send (`fakeSettle`).
 */
export function settleTx(tx: PendingTx, facts: TxFacts | null, broadcasts: boolean, now: () => number): PendingTx {
  if (!broadcasts) return fakeSettle(tx, now())
  if (!facts) return { ...tx, lastCheckedAt: now() }
  const { hashes, receipts, safeBlock, safeNonce } = facts
  const state = deriveState({ current: tx.state, nonce: tx.nonce, receipts, safeBlock, safeNonce })
  const i = receipts.findIndex((r) => r !== null)
  const receipt = receipts[i] ?? null
  return {
    ...tx,
    state,
    lastCheckedAt: now(),
    ...(receipt ? { blockNumber: Number(receipt.blockNumber), minedHash: hashes[i] ?? tx.hash } : {}),
  }
}

/**
 * One status check (S41 "상태 다시 확인", the 15 s poll). Throws when the network could not be asked: the caller keeps the old record.
 * The fake adapter sent nothing: it settles a Pending send after `FAKE_SETTLE_MS` (`fakeSettle`).
 */
export async function checkTx(
  tx: PendingTx,
  chain: Pick<ChainPort, 'broadcasts'> & FactsChain,
  from: Address,
  now: () => number,
): Promise<PendingTx> {
  const facts = needsFacts(tx, chain.broadcasts) ? await fetchTxFacts(tx, chain, from) : null
  return settleTx(tx, facts, chain.broadcasts, now)
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
