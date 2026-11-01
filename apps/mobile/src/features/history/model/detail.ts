import type { HistoryItem } from '@vaultme/history'

/** `<hash>:<seq>` -> `<hash>`. The local send's id is its hash. */
export const hashOfId = (id: string): string => id.split(':')[0] ?? id

/** Route of the S41 screen of a list row. Every row opens it. The `hash` param holds the row `id` (`<hash>:<seq>`; the local send's id is its hash). */
export const detailRoute = (item: Pick<HistoryItem, 'id'>) => ({
  pathname: '/activity/[hash]' as const,
  params: { hash: item.id },
})

/** S41 copy of a history row without a local record (ARCHITECTURE.md#history: history has no confirmation state, so no "확정", no fee, no recheck). */
export function rowCopy(row: Pick<HistoryItem, 'kind' | 'status' | 'caution'>) {
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
    // A caution row (incoming zero-value, Figma 883:4375) has no success sentence: nothing was received.
    body: row.caution
      ? null
      : ok
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

const sameHash = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/**
 * The send recorded on this device wins for its own hash (full S41).
 * `id` is a row id or a bare hash.
 */
export const localRecordMatches = (storedHash: string | undefined, id: string): boolean =>
  storedHash !== undefined && sameHash(storedHash, hashOfId(id))

/**
 * S41 State caution (Q71): the row is an incoming zero-value transfer. `newSender` = the sender is not among `known` (addresses this wallet sent to:
 * the send recents and the sends of the loaded history; null = the history is not loaded, nothing can be claimed). It is a claim ("처음 보는 주소예요"), so it needs a sender and no match. No `caution` = null.
 */
export function cautionOf(
  row: Pick<HistoryItem, 'caution' | 'counterparty'>,
  known: string[] | null,
): { newSender: boolean } | null {
  if (!row.caution) return null
  return { newSender: known !== null && row.counterparty !== '' && !known.some((a) => sameHash(a, row.counterparty)) }
}
