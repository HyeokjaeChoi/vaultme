import { queryOptions } from '@tanstack/react-query'
import type { PushDir } from '@vaultme/history'
import { readPendingTx } from '@/entities/transaction'
import { accountAddress, history } from './loader'

// Not persisted (not in PERSISTED_QUERY_ROOTS): the `historyCache` seam (ADR-0007) already stores the last good first page, and the view also holds this
// device's send. A second stored copy would be a second source of truth.
const meta = { persist: false } as const

/** Cache key of the S40 list view of `address` (null = test-data mode, only the local send). Also the prefix of the row lookups. */
export const historyKey = (address: string | null) => ['history', address] as const

/**
 * The S40 list view (`history.view`: fresh page, or the seam cache with `failed`, or only the local send). `view` never throws, so a failed read is
 * data (`failed: true`), as before. The local send is read when the fetch runs, not from the key.
 */
export const historyQuery = (address: string | null) =>
  queryOptions({
    queryKey: historyKey(address),
    queryFn: () => {
      const raw = readPendingTx()
      return history.view(address, raw === 'corrupt' ? null : raw) // update_required lands in the failed view; the client has already raised the S91 gate
    },
    meta,
  })

/** The S41 row an id and push direction name (`history.findRow`: seam cache first, else a fresh first page). `findRow` never throws. */
export const rowLookupQuery = (id: string, dir: PushDir | undefined) => {
  const address = accountAddress()
  return queryOptions({
    queryKey: [...historyKey(address), 'row', id, dir ?? null] as const,
    queryFn: () => history.findRow(address, id, dir),
    meta,
  })
}
