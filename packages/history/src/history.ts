import { isApiError } from '@vaultme/api-client'
import { merge, parseItems, sameHash, type HistoryItem, type LocalSend } from './items.ts'

/** Last good first page, as stored (ADR-0007). */
export type HistoryCache = { address: string; json: string; updatedAt: number }

export type HistoryDeps = {
  /** POST /v1/history (the API client). */
  fetchPage: (address: string, cursor?: string) => Promise<unknown>
  /** One slot: the last first page of any address. */
  cache: { get(): HistoryCache | null; set(c: HistoryCache): void }
  now: () => number
}

export type HistoryView = {
  items: HistoryItem[]
  /** When the shown list was fetched. Null = nothing was ever fetched. */
  updatedAt: number | null
  /** The last fetch failed. `items` come from the cache (or are empty). */
  failed: boolean
}

export type RowLookup =
  { status: 'row'; row: HistoryItem } | { status: 'none' } | { status: 'several' } | { status: 'failed' }

/** Direction a push names (`deposit` = in, `send` = out). One tx can have a row of each (an address that forwards what it receives). */
export type PushDir = 'in' | 'out'
export const parseDir = (v: string | undefined): PushDir | undefined => (v === 'in' || v === 'out' ? v : undefined)

type Page = { source: 'api'; items: HistoryItem[]; updatedAt: number } | { source: 'local' }

/**
 * The row an S41 route param names. A row id (`<hash>:<seq>`, from the list) is one exact row. A bare hash (from a push)
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

/**
 * History of one account (ARCHITECTURE.md#history): the S40 list and the S41 row lookup over one cached first page.
 * Seams: `fetchPage` and `cache`. No method throws.
 */
export function createHistory(d: HistoryDeps) {
  /** Cached rows of this address. Null = no cache, other account, or unreadable. */
  const cached = (address: string): HistoryItem[] | null => {
    const c = d.cache.get()
    if (!c || !sameHash(c.address, address)) return null
    try {
      return parseItems(JSON.parse(c.json))
    } catch {
      return null
    }
  }

  /** A fresh first page, also written to the cache. 404 (an API without `/v1/history`, e.g. an old deployment) = `local`. Other errors throw. */
  async function fresh(address: string): Promise<Page> {
    try {
      const data = await d.fetchPage(address)
      const updatedAt = d.now()
      d.cache.set({ address, json: JSON.stringify(data ?? null), updatedAt })
      return { source: 'api', items: parseItems(data), updatedAt }
    } catch (e) {
      if (isApiError(e, 'not_found')) return { source: 'local' }
      throw e
    }
  }

  /** ADR-0007: fresh result, or the cache with an error, or (404, no address) only what this device sent. `update_required` never shows the cache (S91). */
  async function view(address: string | null, local: LocalSend | null): Promise<HistoryView> {
    if (!address) return { items: merge([], local), updatedAt: d.now(), failed: false }
    try {
      const p = await fresh(address)
      if (p.source === 'local') return { items: merge([], local), updatedAt: d.now(), failed: false }
      return { items: merge(p.items, local), updatedAt: p.updatedAt, failed: false }
    } catch (e) {
      const c = isApiError(e) && !isApiError(e, 'update_required') ? d.cache.get() : null
      const rows = c ? cached(address) : null
      if (c && rows) return { items: merge(rows, local), updatedAt: c.updatedAt, failed: true }
      return { items: merge([], local), updatedAt: null, failed: true } // no answer and no cache: the sent tx of this device is still shown
    }
  }

  /** Cache-only step of `findRow`: a row, or null when only a fresh page can tell (no cache, other account, none or several rows). */
  function cachedRow(address: string | null, id: string, dir?: PushDir): HistoryItem | null {
    const rows = address ? cached(address) : null
    const r = rows ? pick(rows, id, dir) : null
    return r?.status === 'row' ? r.row : null
  }

  return {
    /**
     * One list consumer (a screen). `load(address, local)` asks for a fresh view; only the newest load's answer reaches `onView`.
     * `address` null = no API or no account: only the local send. `local` = the send recorded on this device (mobile).
     */
    list(onView: (v: HistoryView) => void) {
      let seq = 0
      return async (address: string | null, local: LocalSend | null = null): Promise<void> => {
        const id = ++seq
        const v = await view(address, local)
        if (id === seq) onView(v)
      }
    },
    cachedRow,
    /**
     * S41 for a history row without a local record: the cache first, else a fresh first page (also cached; the pushed tx is usually newer than
     * the cache). `failed` = no address, a fetch error, `update_required` or 404.
     */
    async findRow(address: string | null, id: string, dir?: PushDir): Promise<RowLookup> {
      if (!address) return { status: 'failed' }
      const row = cachedRow(address, id, dir)
      if (row) return { status: 'row', row }
      try {
        const p = await fresh(address)
        return p.source === 'api' ? pick(p.items, id, dir) : { status: 'failed' }
      } catch {
        return { status: 'failed' }
      }
    },
  }
}

export type History = ReturnType<typeof createHistory>
