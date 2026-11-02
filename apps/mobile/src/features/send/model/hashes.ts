import type { PendingTx } from '@/shared/storage'

/** All own hashes of the send, original first (a record saved before ADR-0031 has no `hashes`: its one `hash`). */
export const ownHashes = (tx: Pick<PendingTx, 'hash' | 'hashes'>): string[] => tx.hashes ?? [tx.hash]
/** The newest sent hash. */
const latestHash = (tx: Pick<PendingTx, 'hash' | 'hashes'>): string => ownHashes(tx).at(-1) ?? tx.hash
/** The hash Etherscan links to: the mined one, else the latest sent (ADR-0031). */
export const explorerHash = (tx: Pick<PendingTx, 'hash' | 'hashes' | 'minedHash'>): string =>
  tx.minedHash ?? latestHash(tx)

/** Index of the cancel tx in `hashes`: the last one while the latest replacement is a cancel (a cancel is final in the UI: no later replacement). null = no cancel. */
export const cancelIndexOf = (tx: Pick<PendingTx, 'hash' | 'hashes' | 'kind'>): number | null =>
  tx.kind === 'cancel' ? ownHashes(tx).length - 1 : null
/** The original (or a speed-up) was processed although a cancel was sent: the cancel lost (ADR-0031). */
export const processedBeforeCancel = (tx: Pick<PendingTx, 'hash' | 'hashes' | 'kind' | 'minedHash'>): boolean =>
  tx.kind === 'cancel' && tx.minedHash !== undefined && tx.minedHash !== latestHash(tx)
