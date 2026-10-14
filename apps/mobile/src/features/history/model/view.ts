import { HistoryItem as ApiHistoryItem } from '@vaultme/contracts'
import { fromUnits } from '@vaultme/wallet-core'
import type { HistoryResult } from '@/shared/api/history'
import type { PendingTx } from '@/shared/storage'
import type { ActivityStatus } from '@/shared/ui'
import { txView } from '@/features/send/model/txView'

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

/**
 * `POST /v1/history` response (lld.md §4.2): `{ items: HistoryItem[], nextCursor, incomplete }`. Each item is checked against the
 * contract and dropped when it does not fit (a newer server may send what this app does not know). Items are always on-chain
 * (`ok` | `failed`); pending sends come from the local record. Incoming zero-value rows are hidden (Q71). Paging with `nextCursor` is not used yet.
 */
export function parseItems(data: unknown): HistoryItem[] {
  const items = (data as { items?: unknown } | null)?.items
  if (!Array.isArray(items)) return []
  const out: HistoryItem[] = []
  for (const x of items) {
    const p = ApiHistoryItem.safeParse(x)
    if (!p.success) continue
    const i = p.data
    if (i.zeroValue && i.direction === 'in') continue // Q71: incoming 0-value rows are the address-poisoning vector. Own calls stay.
    out.push({
      hash: i.hash,
      kind: i.direction === 'out' ? 'send' : 'receive',
      asset: i.asset,
      amount: fromUnits(BigInt(i.value), i.asset),
      counterparty: (i.direction === 'out' ? i.to : i.from) ?? '',
      at: i.timestamp * 1000,
      ...txView(i.status === 'ok' ? 'Confirmed' : 'Failed'),
      local: false,
    })
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
