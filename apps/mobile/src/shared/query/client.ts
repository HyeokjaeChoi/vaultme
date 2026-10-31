import { QueryClient } from '@tanstack/react-query'

/** Longest age of a persisted cache, and the `gcTime` that keeps it in memory that long (TanStack: `gcTime` >= `maxAge`, or the restored cache is dropped early). */
export const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000

/**
 * The app's one QueryClient (ADR-0021). `retry: false` keeps the behavior from before TanStack Query: one failed read shows no new number and the
 * old one stays. Defaults stay on for the rest (stale at once, refetch on mount, on app focus and on reconnect).
 */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { gcTime: CACHE_MAX_AGE_MS, retry: false } },
})
