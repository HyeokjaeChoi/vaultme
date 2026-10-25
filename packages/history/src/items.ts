import { HistoryItem as ApiHistoryItem } from '@vaultme/contracts'
import { fromUnits } from '@vaultme/wallet-core'

/** Send state as the chain shows it (ARCHITECTURE.md#invariants). */
export type TxState = 'Pending' | 'Included' | 'Confirmed' | 'Failed' | 'Unknown' | 'Replaced'
export type RowStatus = 'pending' | 'confirmed' | 'failed' | 'unknown' | 'replaced'

/** Icon status and i18n label of a send in lists and on S23/S41. Replaced has its own badge (refresh): nothing was executed, nothing went wrong on chain. */
export function txView(state: TxState): {
  status: RowStatus
  label: `activity.${'pending' | 'included' | 'confirmed' | 'failed' | 'unknown' | 'replaced'}`
} {
  switch (state) {
    case 'Pending':
      return { status: 'pending', label: 'activity.pending' }
    case 'Included':
      return { status: 'pending', label: 'activity.included' }
    case 'Confirmed':
      return { status: 'confirmed', label: 'activity.confirmed' }
    case 'Failed':
      return { status: 'failed', label: 'activity.failed' }
    case 'Replaced':
      return { status: 'replaced', label: 'activity.replaced' }
    default:
      return { status: 'unknown', label: 'activity.unknown' }
  }
}

export type HistoryItem = {
  /** List key. API rows: `<hash>:<seq>` (one tx can have several rows). The local send: its hash. */
  id: string
  hash: string
  kind: 'send' | 'receive'
  asset: string
  /** Decimal string, no sign. */
  amount: string
  counterparty: string
  /** ms since epoch */
  at: number
  status: RowStatus
  /** i18n key of the status words. */
  label: ReturnType<typeof txView>['label']
  /** The send recorded on this device: S41 shows its full record. */
  local: boolean
  /** API rows only (S41 "블록"). */
  blockNumber?: number
}

/** The send recorded on this device (mobile only). */
export type LocalSend = {
  hash: string
  asset: string
  to: string
  amount: string
  createdAt: number
  state: TxState
}

/**
 * `POST /v1/history` response (ARCHITECTURE.md#history): `{ items: HistoryItem[], nextCursor, incomplete }`. Each item is checked against the
 * contract and dropped when it does not fit (a newer server may send what this app does not know). Items are always on-chain
 * (`ok` | `failed`); pending sends come from the local record. Incoming zero-value rows are hidden. Paging with `nextCursor` is not used yet.
 */
export function parseItems(data: unknown): HistoryItem[] {
  const items = (data as { items?: unknown } | null)?.items
  if (!Array.isArray(items)) return []
  const out: HistoryItem[] = []
  for (const x of items) {
    const p = ApiHistoryItem.safeParse(x)
    if (!p.success) continue
    const i = p.data
    if (i.zeroValue && i.direction === 'in') continue // Incoming 0-value rows are the address-poisoning vector. Own calls stay.
    out.push({
      id: i.id,
      hash: i.hash,
      kind: i.direction === 'out' ? 'send' : 'receive',
      asset: i.asset,
      amount: fromUnits(BigInt(i.value), i.asset),
      counterparty: (i.direction === 'out' ? i.to : i.from) ?? '',
      at: i.timestamp * 1000,
      ...txView(i.status === 'ok' ? 'Confirmed' : 'Failed'),
      local: false,
      blockNumber: i.blockNumber,
    })
  }
  return out
}

/** `nextCursor` of a `POST /v1/history` response. Null = last page, or a body that is not a response. */
export function parseNextCursor(data: unknown): string | null {
  const c = (data as { nextCursor?: unknown } | null)?.nextCursor
  return typeof c === 'string' && c !== '' ? c : null
}

const fromLocal = (tx: LocalSend): HistoryItem => ({
  id: tx.hash,
  hash: tx.hash,
  kind: 'send',
  asset: tx.asset,
  amount: tx.amount,
  counterparty: tx.to,
  at: tx.createdAt,
  ...txView(tx.state),
  local: true,
})

export const sameHash = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/** Newest first. The send recorded on this device wins over an API row with the same hash: its state is the one this app checks. */
export function merge(api: HistoryItem[], local: LocalSend | null): HistoryItem[] {
  const rest = local ? api.filter((i) => !sameHash(i.hash, local.hash)) : api
  const all = local ? [fromLocal(local), ...rest] : [...rest]
  all.sort((a, b) => b.at - a.at)
  return all
}
