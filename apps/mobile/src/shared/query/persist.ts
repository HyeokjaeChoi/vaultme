import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { defaultShouldDehydrateQuery } from '@tanstack/react-query'
import type { Persister, PersistQueryClientOptions } from '@tanstack/react-query-persist-client'
import { CACHE_MAX_AGE_MS } from './client'

/** Synchronous key-value storage (the encrypted MMKV in the app). */
export type SyncStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export const QUERY_CACHE_KEY = 'queryCache'

/**
 * First key part of every query that may be written to storage. Only these are persisted, so the JSON writer never meets a bigint or a secret.
 * A query joins this list only when its data is JSON-safe (balances are decimal strings). Today: `balances`.
 * A query can also opt out with `meta: { persist: false }` (balances read from the fake chain).
 */
export const PERSISTED_QUERY_ROOTS: readonly string[] = ['balances']

/** Change it to drop every stored cache (a data shape change). */
const BUSTER = 'v1'

export function persistOptions(
  storage: SyncStorage,
  throttleTime = 1000,
): Omit<PersistQueryClientOptions, 'queryClient'> {
  const base = createAsyncStoragePersister({ storage, key: QUERY_CACHE_KEY, throttleTime })
  // The library's `maxAge` checks the age of the saved blob, and a failed refetch saves the blob again with a new timestamp while the query keeps old data
  // (checked in @tanstack/query-persist-client-core 5.104.5, persist.ts). So the age of each query is checked here, when it is restored.
  const persister: Persister = {
    ...base,
    restoreClient: async () => {
      const c = await base.restoreClient()
      if (!c) return c
      const queries = c.clientState.queries.filter((q) => Date.now() - q.state.dataUpdatedAt <= CACHE_MAX_AGE_MS)
      return { ...c, clientState: { ...c.clientState, queries } }
    },
  }
  return {
    persister,
    maxAge: CACHE_MAX_AGE_MS,
    buster: BUSTER,
    dehydrateOptions: {
      shouldDehydrateQuery: (q) =>
        defaultShouldDehydrateQuery(q) &&
        PERSISTED_QUERY_ROOTS.includes(String(q.queryKey[0])) &&
        q.meta?.persist !== false,
    },
  }
}
