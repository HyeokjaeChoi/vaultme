import type { HistoryCache, PendingTx } from '../storage/kv'
import { isApiError, type ApiError } from './errors'

export type HistoryDeps = {
  /** POST /v1/history. */
  fetchPage: (address: string, cursor?: string) => Promise<unknown>
  cache: { get(): HistoryCache | null; set(c: HistoryCache): void }
  /** Sent txs recorded on this device. */
  local: () => PendingTx[]
  now: () => number
}

export type HistoryResult =
  | { source: 'api'; data: unknown; updatedAt: number }
  | { source: 'cache'; data: unknown; updatedAt: number; error: ApiError }
  | { source: 'local'; sent: PendingTx[] }

/**
 * Q58: last good result is kept with its update time. `POST /v1/history` may not exist yet (#42): 404 -> locally recorded sends.
 * Other failures show the cache (with the error) or throw. `update_required` always throws (S91 is #44).
 */
export function createHistory(d: HistoryDeps) {
  return {
    async load(address: string, cursor?: string): Promise<HistoryResult> {
      try {
        const data = await d.fetchPage(address, cursor)
        const updatedAt = d.now()
        if (cursor === undefined) d.cache.set({ address, json: JSON.stringify(data ?? null), updatedAt })
        return { source: 'api', data, updatedAt }
      } catch (e) {
        if (isApiError(e, 'not_found')) return { source: 'local', sent: d.local() }
        if (!isApiError(e) || isApiError(e, 'update_required')) throw e
        const c = d.cache.get()
        if (c && c.address === address) return { source: 'cache', data: JSON.parse(c.json) as unknown, updatedAt: c.updatedAt, error: e }
        throw e
      }
    },
  }
}
