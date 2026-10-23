import type { ChainPort } from '@/shared/chain/port'
import type { PendingTx } from '@/shared/storage'

/** Test mode only: clears the fake pending tx so a new send can start (lifts the ADR-0006 block). With a real adapter nothing is cleared. Returns whether it cleared. */
export function clearTestTx(chain: Pick<ChainPort, 'broadcasts'>, setPending: (tx: PendingTx | null) => void): boolean {
  if (chain.broadcasts) return false
  setPending(null)
  return true
}
