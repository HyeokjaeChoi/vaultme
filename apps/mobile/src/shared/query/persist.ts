import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { defaultShouldDehydrateQuery } from '@tanstack/react-query'
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client'
import { CACHE_MAX_AGE_MS } from './client'

/** Synchronous key-value storage (the encrypted MMKV in the app). */
export type SyncStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

/**
 * First key part of every query that may be written to storage. Only these are persisted, so the JSON writer never meets a bigint or a secret.
 * A query joins this list only when its data is JSON-safe (balances are decimal strings). Today: `balances`.
 */
export const PERSISTED_QUERY_ROOTS: readonly string[] = ['balances']

/** Change it to drop every stored cache (a data shape change). */
const BUSTER = 'v1'

export function persistOptions(
  storage: SyncStorage,
  throttleTime = 1000,
): Omit<PersistQueryClientOptions, 'queryClient'> {
  return {
    persister: createAsyncStoragePersister({ storage, key: 'queryCache', throttleTime }),
    maxAge: CACHE_MAX_AGE_MS,
    buster: BUSTER,
    dehydrateOptions: {
      shouldDehydrateQuery: (q) =>
        defaultShouldDehydrateQuery(q) && PERSISTED_QUERY_ROOTS.includes(String(q.queryKey[0])),
    },
  }
}
