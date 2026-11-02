import type { PendingTx } from '@/shared/storage'

/** All own hashes of the send, original first (a record saved before ADR-0031 has no `hashes`: its one `hash`). */
export const ownHashes = (tx: Pick<PendingTx, 'hash' | 'hashes'>): string[] => tx.hashes ?? [tx.hash]
/** The newest sent hash. */
const latestHash = (tx: Pick<PendingTx, 'hash' | 'hashes'>): string => ownHashes(tx).at(-1) ?? tx.hash
/** The hash Etherscan links to: the mined one, else the latest sent (ADR-0031). */
export const explorerHash = (tx: Pick<PendingTx, 'hash' | 'hashes' | 'minedHash'>): string =>
  tx.minedHash ?? latestHash(tx)
