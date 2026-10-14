import type { HistoryResult } from '@/shared/api/history'
import type { PendingTx } from '@/shared/storage'
import type { ActivityStatus } from '@/shared/ui'
import { txView } from '@/features/send/model/txView'
import type { TxState } from '@/features/send/model/txState'

export type HistoryItem = {
  hash: string
  kind: 'send' | 'receive'
  asset: string
  /** Decimal string, no sign. */
  amount: string
  counterparty: string
  /** ms since epoch */
  at: number
  status: ActivityStatus
  /** i18n key of the status words. */
  label: ReturnType<typeof txView>['label']
  /** The send recorded on this device: its row opens S41. */
  local: boolean
}

const STATUS: Record<string, TxState> = { pending: 'Pending', confirmed: 'Confirmed', failed: 'Failed' }
const str = (v: unknown): v is string => typeof v === 'string' && v.length > 0

/**
 * ponytail: the `POST /v1/history` response shape is not fixed yet (#42). This reads `{ items: [{ hash, kind, asset, amount, counterparty,
 * timestamp (unix seconds), status: pending | confirmed | failed }] }` and drops anything else. Change it together with #42.
 */
export function parseItems(data: unknown): HistoryItem[] {
  const items = (data as { items?: unknown } | null)?.items
  if (!Array.isArray(items)) return []
  const out: HistoryItem[] = []
  for (const x of items as Record<string, unknown>[]) {
    const state = typeof x?.status === 'string' ? STATUS[x.status] : undefined
    if (!str(x?.hash) || (x.kind !== 'send' && x.kind !== 'receive') || !str(x.asset) || !str(x.amount) || !str(x.counterparty) || typeof x.timestamp !== 'number' || !state) continue
    out.push({ hash: x.hash, kind: x.kind, asset: x.asset, amount: x.amount, counterparty: x.counterparty, at: x.timestamp * 1000, ...txView(state), local: false })
  }
  return out
}

const fromLocal = (tx: PendingTx): HistoryItem => ({ hash: tx.hash, kind: 'send', asset: tx.asset, amount: tx.amount, counterparty: tx.to, at: tx.createdAt, ...txView(tx.state), local: true })

export type HistoryView = {
  items: HistoryItem[]
  /** When the shown list was fetched. Null = nothing was ever fetched. */
  updatedAt: number | null
  /** The last fetch failed. `items` come from the cache (or are empty). */
  failed: boolean
}

/** Newest first. The send recorded on this device wins over an API row with the same hash: its state is the one this app checks. */
function merge(api: HistoryItem[], local: PendingTx | null): HistoryItem[] {
  const rest = local ? api.filter((i) => i.hash.toLowerCase() !== local.hash.toLowerCase()) : api
  return (local ? [fromLocal(local), ...rest] : rest).sort((a, b) => b.at - a.at)
}

/** Q58: fresh result, or the cache with an error, or (404) only what this device sent. */
export function toView(r: HistoryResult, local: PendingTx | null, now: number): HistoryView {
  if (r.source === 'api') return { items: merge(parseItems(r.data), local), updatedAt: r.updatedAt, failed: false }
  if (r.source === 'cache') return { items: merge(parseItems(r.data), local), updatedAt: r.updatedAt, failed: true }
  return { items: merge([], local), updatedAt: now, failed: false }
}

/** No answer and no cache: the sent tx of this device is still shown. */
export const failedView = (local: PendingTx | null): HistoryView => ({ items: merge([], local), updatedAt: null, failed: true })
