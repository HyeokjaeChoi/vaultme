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

export type RowLookup =
  { status: 'row'; row: HistoryItem } | { status: 'none' } | { status: 'several' } | { status: 'failed' }

const sameHash = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/** Direction a push names (`deposit` = in, `send` = out). One tx can have a row of each (an address that forwards what it receives). */
export type PushDir = 'in' | 'out'
export const parseDir = (v: string | undefined): PushDir | undefined => (v === 'in' || v === 'out' ? v : undefined)

/**
 * The send recorded on this device wins for its own hash (full S41), unless the push says `in`: a self-send's deposit leg is a history row.
 * `id` is a row id or a bare hash.
 */
export const localRecordMatches = (storedHash: string | undefined, id: string, dir?: PushDir): boolean =>
  storedHash !== undefined && sameHash(storedHash, hashOfId(id)) && dir !== 'in'

/**
 * The row an S41 route param names, from rows already loaded. A row id (`<hash>:<seq>`, from the list) is one exact row. A bare hash (from a push)
 * is a row only when exactly one row has that hash; with several, the caller must not guess which one the user means.
 * A push also names a direction: then only rows of that direction count.
 */
function pick(rows: HistoryItem[], id: string, dir?: PushDir): RowLookup {
  if (id.includes(':')) {
    const row = rows.find((i) => i.id === id)
    return row ? { status: 'row', row } : { status: 'none' }
  }
  const same = rows.filter((i) => sameHash(i.hash, id) && (!dir || i.kind === (dir === 'in' ? 'receive' : 'send')))
  const [only] = same
  return same.length === 1 && only ? { status: 'row', row: only } : { status: same.length ? 'several' : 'none' }
}

/** Cache-only step of `resolveRow`: a row, or null when only a fresh page can tell (no cache, other account, none or several rows). */
export function rowFromCache(
  id: string,
  address: string | null,
  cache: HistoryCache | null,
  dir?: PushDir,
): RowLookup | null {
  if (!address || cache?.address.toLowerCase() !== address.toLowerCase()) return null
  let data: unknown
  try {
    data = JSON.parse(cache.json)
  } catch {
    return null
  }
  const r = pick(parseItems(data), id, dir)
  return r.status === 'row' ? r : null
}

/**
 * S41 for a history row without a local record: the cache first, else a fresh first page (`fresh` also writes it to the cache).
 * The pushed tx is usually newer than the cache. `failed` = no address, a fetch error or `update_required`.
 */
export async function resolveRow(
  id: string,
  d: { address(): string | null; cache(): HistoryCache | null; fresh(address: string): Promise<unknown> },
  dir?: PushDir,
): Promise<RowLookup> {
  try {
    const address = d.address()
    if (!address) return { status: 'failed' }
    const cached = rowFromCache(id, address, d.cache(), dir)
    if (cached) return cached
    return pick(parseItems(await d.fresh(address)), id, dir)
  } catch {
    return { status: 'failed' }
  }
}
