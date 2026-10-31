import type { InternalTransfer } from '@vaultme/api-client'
import { useQuery } from '@tanstack/react-query'
import { queryClient, retryOf } from './query'

/** `failed`: the read did not work (network, API, a bad answer, a build too old, no answer in time). It only affects the section, never the page. */
export type Internal = { status: 'loading' } | { status: 'failed' } | { status: 'ok'; items: InternalTransfer[] }

type Ok = Extract<Internal, { status: 'ok' }>

/**
 * The API client has no deadline of its own: a read that never answers is a failed section after this long, so the section never
 * loads forever.
 */
export const INTERNAL_DEADLINE_MS = 10_000

// Loads on first read, like useTransaction. A chunk that fails to load is a failed section too: retry imports it again. The deadline
// starts before the imports, so a script request that never answers fails the section as well.
async function load(hash: string): Promise<Ok> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('internal transfers: no answer')), INTERNAL_DEADLINE_MS)
    })
    const read = async () => {
      const [{ api }, m] = await Promise.all([import('./client'), import('@vaultme/api-client')])
      return m.readInternalTransfers((h) => api().txInternal(h), hash)
    }
    return { status: 'ok', items: await Promise.race([read(), deadline]) }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * The internal transfers of `hash` (`readInternalTransfers`, ADR-0015), read beside `useTransaction` and apart from it: the page shows
 * the transaction when its own reads are done, and this section has its own loading, list and error. Same query keying as
 * `useTransaction` (an answer belongs to its hash).
 */
export function useInternalTransfers(hash: string | null): [Internal, retry: () => void] {
  const queryKey = ['internal', hash]
  const retry = retryOf(queryKey)
  const q = useQuery({ queryKey, queryFn: () => load(hash ?? ''), enabled: !!hash }, queryClient)
  const state: Internal = q.data ?? (q.isError ? { status: 'failed' } : { status: 'loading' })
  return [state, retry]
}
