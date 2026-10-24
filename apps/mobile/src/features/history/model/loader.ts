import { api, createHistory, historyCache } from '@/shared/api'
import { parseItems } from './view'

const client = api
/** The one history loader: it caches the first page in `historyCache`, which the list and S41 read. null = test-data mode (no API). */
export const history = client
  ? createHistory({ fetchPage: (a, c) => client.history(a, c), cache: historyCache, local: () => [], now: Date.now })
  : null

/**
 * Row ids (`<hash>:<seq>`) of the rows with `hash` in a fresh first page (case-insensitive). The page is cached before this returns.
 * Rejects when the answer is not fresh (cache fallback, 404 local list, error, `update_required`): the caller must not trust it.
 */
export const freshRowIdsForHash = history
  ? async (address: string, hash: string): Promise<string[]> => {
      const r = await history.load(address)
      if (r.source !== 'api') throw new Error('history page is not fresh')
      return parseItems(r.data)
        .filter((i) => i.hash.toLowerCase() === hash.toLowerCase())
        .map((i) => i.id)
    }
  : null
