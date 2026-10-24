import { api, createHistory, historyCache } from '@/shared/api'

const client = api
/** The one history loader: it caches the first page in `historyCache`, which the list and S41 read. null = test-data mode (no API). */
export const history = client
  ? createHistory({ fetchPage: (a, c) => client.history(a, c), cache: historyCache, local: () => [], now: Date.now })
  : null

/**
 * A fresh first page (already written to `historyCache` by `history.load`). Rejects when the answer is not fresh (cache fallback, 404 local
 * list, error, `update_required`, no API): the caller must not trust it.
 */
export async function freshHistoryPage(address: string): Promise<unknown> {
  if (!history) throw new Error('no history API')
  const r = await history.load(address)
  if (r.source !== 'api') throw new Error('history page is not fresh')
  return r.data
}
