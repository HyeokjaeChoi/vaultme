import { queryOptions } from '@tanstack/react-query'
import type { Address } from '@vaultme/wallet-core'
import { chain } from '@/shared/chain'
import { ownHashes } from './hashes'
import type { PendingTx } from '@/shared/storage'
import { fetchTxFacts } from './txState'

/**
 * The network facts of one send's status check (ADR-0021 PR 3). The query only fetches: the stored `PendingTx` stays the source of the send status,
 * and `settleTx` (wallet-core `deriveState`) turns facts into a state. Never persisted and never reused: `gcTime: 0` drops it once nobody reads it,
 * and the check always asks (`qc.query` with `staleTime` 0 shares only a read already in flight), so an old receipt cannot move a state.
 */
export const txFactsQuery = (tx: Pick<PendingTx, 'hash' | 'hashes'>, from: Address) =>
  queryOptions({
    queryKey: ['txFacts', ...ownHashes(tx)] as const,
    queryFn: () => fetchTxFacts(tx, chain, from),
    gcTime: 0,
    meta: { persist: false },
  })
