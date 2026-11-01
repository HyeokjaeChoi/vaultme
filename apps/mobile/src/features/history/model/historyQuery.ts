import { queryOptions } from '@tanstack/react-query'
import { readPendingTx } from '@/entities/transaction'
import type { PendingTx } from '@/shared/storage'
import { accountAddress, history } from './loader'

// Not persisted (not in PERSISTED_QUERY_ROOTS): the `historyCache` seam (ADR-0007) already stores the last good first page, and the view also holds this
// device's send. A second stored copy would be a second source of truth.
const meta = { persist: false } as const

/** Cache key of the S40 list view of `address` (null = test-data mode, only the local send). */
export const historyKey = (address: string | null) => ['history', address] as const

const localSend = (): PendingTx | null => {
  const raw = readPendingTx()
  return raw === 'corrupt' ? null : raw
}
const sameSend = (a: PendingTx | null, b: PendingTx | null) => a?.hash === b?.hash && a?.state === b?.state

/**
 * The S40 list view (`history.view`: fresh page, or the seam cache with `failed`, or only the local send). `view` never throws, so a failed read is
 * data (`failed: true`), as before; `update_required` lands in the failed view (the client has already raised the S91 gate).
 * The local send is read when the fetch runs, not from the key. Callers share a read already running, so if the send changed while the page was
 * fetched (a check wrote Confirmed), the view is built again with the new send: the list never keeps "보내는 중" for a send that settled.
 */
export const historyQuery = (address: string | null) =>
  queryOptions({
    queryKey: historyKey(address),
    queryFn: async () => {
      const before = localSend()
      const v = await history.view(address, before)
      return sameSend(before, localSend()) ? v : history.view(address, localSend())
    },
    meta,
  })

/** The S41 row an id names (`history.findRow`: seam cache first, else a fresh first page). `findRow` never throws. */
export const rowLookupQuery = (id: string) => {
  const address = accountAddress()
  return queryOptions({
    queryKey: ['historyRow', address, id] as const,
    queryFn: () => history.findRow(address, id),
    // Read on mount, key change and `retry` only, as before: an app return must not turn a not-found or failed screen into a spinner.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta,
  })
}
