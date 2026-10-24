import type { HistoryCache } from '@/shared/storage'
import { parseItems, type HistoryItem } from './view'

/** `<hash>:<seq>` -> `<hash>`. The local send's id is its hash. */
export const hashOfId = (id: string): string => id.split(':')[0] ?? id

/** Route of the S41 screen of a list row. Every row opens it. The `hash` param holds the row `id` (`<hash>:<seq>`; the local send's id is its hash). */
export const detailRoute = (item: Pick<HistoryItem, 'id'>) => ({
  pathname: '/activity/[hash]' as const,
  params: { hash: item.id },
})

/** The row `id` in the cached history (ARCHITECTURE.md#history), for this account only. Null = not loaded, other account, or unknown id. */
export function findCachedRow(cache: HistoryCache | null, address: string | null, id: string): HistoryItem | null {
  if (!cache || !address) return null
  if (cache.address.toLowerCase() !== address.toLowerCase()) return null
  let data: unknown
  try {
    data = JSON.parse(cache.json)
  } catch {
    return null
  }
  return parseItems(data).find((i) => i.id === id) ?? null
}

/** S41 copy of a history row without a local record (ARCHITECTURE.md#history: history has no confirmation state, so no "확정", no fee, no recheck). */
export function rowCopy(row: Pick<HistoryItem, 'kind' | 'status'>) {
  const incoming = row.kind === 'receive'
  const ok = row.status === 'confirmed'
  const failed = row.status === 'failed'
  return {
    counterpartyTitle: incoming ? ('detail.senderTitle' as const) : ('detail.recipientWho' as const),
    accountLabel: incoming ? ('detail.receivedAccount' as const) : ('detail.sender' as const),
    badge: ok ? ('confirmed' as const) : failed ? ('failed' as const) : ('pending' as const),
    title: ok
      ? incoming
        ? ('detail.received' as const)
        : ('result.sent' as const)
      : failed
        ? incoming
          ? ('detail.failed.title' as const)
          : ('result.failedTitle' as const)
        : ('result.sending' as const),
    // A failed incoming row: the existing failure body says the sender's fee left, which is not ours to claim.
    body: ok
      ? ('detail.success.body' as const)
      : failed
        ? incoming
          ? null
          : ('detail.failed.body' as const)
        : ('result.pendingBody' as const),
    statusWord: ok
      ? ('detail.state.success' as const)
      : failed
        ? ('activity.failed' as const)
        : ('activity.pending' as const),
  }
}
