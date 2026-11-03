import type { PendingTx } from '@/shared/storage'

/** All own hashes of the send, original first (a record saved before ADR-0031 has no `hashes`: its one `hash`). */
export const ownHashes = (tx: Pick<PendingTx, 'hash' | 'hashes'>): string[] => tx.hashes ?? [tx.hash]
/** The newest sent hash. */
const latestHash = (tx: Pick<PendingTx, 'hash' | 'hashes'>): string => ownHashes(tx).at(-1) ?? tx.hash
/** The hash Etherscan links to: the mined one, else the latest sent (ADR-0031). */
export const explorerHash = (tx: Pick<PendingTx, 'hash' | 'hashes' | 'minedHash'>): string =>
  tx.minedHash ?? latestHash(tx)

/** Index in `hashes` of the first cancel: it and every later hash is a cancel (ADR-0031). A record without `cancelFrom` (sent before it existed) has its one cancel last. null = no cancel. */
export const cancelFromOf = (tx: Pick<PendingTx, 'hash' | 'hashes' | 'kind' | 'cancelFrom'>): number | null =>
  tx.kind === 'cancel' ? (tx.cancelFrom ?? ownHashes(tx).length - 1) : null
const minedIsCancel = (
  tx: Pick<PendingTx, 'hash' | 'hashes' | 'kind' | 'cancelFrom' | 'minedHash'>,
): boolean | null => {
  const from = cancelFromOf(tx)
  if (from === null || tx.minedHash === undefined) return null
  return ownHashes(tx).indexOf(tx.minedHash) >= from
}
/**
 * A cancel tx itself was mined and is final: Replaced with a cancel as the mined hash. A Replaced from another tx taking the nonce
 * (no receipt of ours) is not a cancel (ADR-0031): it keeps the plain Replaced copy.
 */
export const cancelMined = (
  tx: Pick<PendingTx, 'hash' | 'hashes' | 'kind' | 'cancelFrom' | 'minedHash' | 'state'>,
): boolean => tx.state === 'Replaced' && minedIsCancel(tx) === true
/** The original (or a speed-up) was processed although a cancel was sent: the cancel lost (ADR-0031). */
export const processedBeforeCancel = (
  tx: Pick<PendingTx, 'hash' | 'hashes' | 'kind' | 'cancelFrom' | 'minedHash'>,
): boolean => minedIsCancel(tx) === false
