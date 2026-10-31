import type { HistoryItem, HistoryView } from '@vaultme/history'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { queryClient, retryOf } from './query'

/** `more`: the state of the 더 보기 request. `failed` keeps the rows and the cursor, so a second try asks for the same page. */
export type History =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'ok'; items: HistoryItem[]; nextCursor: string | null; more: 'idle' | 'loading' | 'failed' }

// The history module and the API client load on first read, not with the page (same reason as useBalances).
async function historyModule() {
  const [{ api }, { createHistory }] = await Promise.all([import('./client'), import('@vaultme/history')])
  // The web keeps no cache (ADR-0011: nothing is stored but the install key): every read asks the API.
  return createHistory({
    fetchPage: (a, cursor) => api().history(a, cursor),
    cache: { get: () => null, set: () => undefined },
    now: Date.now,
  })
}

type Page = { items: HistoryItem[]; nextCursor: string | null }

/** One page: the first (`cursor` null, through `list`) or an older one. A failed read throws, so the query keeps the rows it has. */
async function page(address: string, cursor: string | null): Promise<Page> {
  const h = await historyModule() // a chunk that fails to load (offline, a newer deploy) throws too: retry imports it again
  if (cursor) {
    const r = await h.more(address, cursor)
    if (!r) throw new Error('history: older page failed')
    return r
  }
  const v = await new Promise<HistoryView>((resolve) => void h.list(resolve)(address))
  // No cache: a failed view has no rows. A 426 shows as failed here; the balances section already asks for a reload.
  if (v.failed) throw new Error('history: first page failed')
  return { items: v.items, nextCursor: v.nextCursor }
}

/**
 * The history of `address` through the shared module (`@vaultme/history`: contract check, poisoning filter, newest first) as an
 * infinite query (TanStack Query, ADR-0021) keyed by address: an answer never shows for an address the user left, and 더 보기
 * (`more`) asks for the cursor of the last page. A failed `more` keeps the rows and the cursor, so a second try asks for the same page.
 */
export function useHistory(address: string | null): [History, { retry: () => void; more: () => void }] {
  const queryKey = ['history', address]
  const retry = retryOf(queryKey)
  const q = useInfiniteQuery(
    {
      queryKey,
      queryFn: ({ pageParam }) => page(address ?? '', pageParam),
      initialPageParam: null as string | null,
      getNextPageParam: (last) => last.nextCursor,
      enabled: !!address,
    },
    queryClient,
  )
  // Same array while the pages are the same: HistorySection restarts its minute clock when `items` changes.
  const items = useMemo(() => {
    const seen = new Set<string>()
    return (q.data?.pages ?? []).flatMap((p) => p.items).filter((i) => !seen.has(i.id) && seen.add(i.id))
  }, [q.data])
  let shown: History = q.isError ? { status: 'failed' } : { status: 'loading' }
  if (q.data) {
    shown = {
      status: 'ok',
      items,
      nextCursor: q.data.pages.at(-1)?.nextCursor ?? null,
      more: q.isFetchingNextPage ? 'loading' : q.isFetchNextPageError ? 'failed' : 'idle',
    }
  }
  const more = () => {
    if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage()
  }
  return [shown, { retry, more }]
}
