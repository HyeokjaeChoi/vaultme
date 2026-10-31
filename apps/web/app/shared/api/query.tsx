import { type QueryKey, QueryClient, notifyManager } from '@tanstack/react-query'

/** A read answered 426: this cached build is too old (ADR-0011: "새로고침해 주세요"). Thrown by a query function, shown as `update`. */
export class UpdateRequiredError extends Error {}

/**
 * ADR-0021 (Q62): server state of the viewer is TanStack Query 5, in memory only (the web keeps no cache, ADR-0011).
 * `gcTime: 0` drops a read when its screen leaves it, so a return to an address after its read ended reads again and shows the
 * skeleton first, as before. No retry and no refetch on focus: a failed read shows its own retry button, and the viewer never
 * reads on its own.
 */
export const queryClient = new QueryClient({
  // networkMode 'always': the read runs even when the browser says offline, so it fails and shows its retry button (as before)
  // instead of pausing on the skeleton. No refetch on focus or reconnect: the viewer never reads on its own.
  defaultOptions: {
    queries: { gcTime: 0, retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false, networkMode: 'always' },
  },
})

// Notify at once instead of one timer tick later: a click that starts a read (더 보기) then shows its loading state in the same
// render as the click's own state (HistorySection moves the focus by it). React batches the updates of an event handler.
notifyManager.setScheduler((callback) => callback())

/**
 * Retry of a failed read: the query goes back to its first state and reads again, so the screen shows loading until it answers
 * (a plain `refetch` would keep showing the old answer) and an answer of the read that was replaced never shows.
 */
export const retryOf = (queryKey: QueryKey) => () => void queryClient.resetQueries({ queryKey })
