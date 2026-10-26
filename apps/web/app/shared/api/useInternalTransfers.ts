import type { InternalTransfer } from '@vaultme/api-client'
import { useCallback, useEffect, useRef, useState } from 'react'

/** `failed`: the read did not work (network, API, a bad answer, a build too old, no answer in time). It only affects the section, never the page. */
export type Internal = { status: 'loading' } | { status: 'failed' } | { status: 'ok'; items: InternalTransfer[] }

type Settled = Exclude<Internal, { status: 'loading' }>

/**
 * The API client has no deadline of its own: a read that never answers is a failed section after this long, so the section never
 * loads forever.
 */
export const INTERNAL_DEADLINE_MS = 10_000

// Loads on first read, like useTransaction. A chunk that fails to load is a failed section too: retry imports it again. The deadline
// starts before the imports, so a script request that never answers fails the section as well.
async function load(hash: string): Promise<Settled> {
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
  } catch {
    return { status: 'failed' }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * The internal transfers of `hash` (`readInternalTransfers`, ADR-0015), read beside `useTransaction` and apart from it: the page shows
 * the transaction when its own reads are done, and this section has its own loading, list and error. Same request numbering as
 * `useTransaction` (only the newest read shows, the state belongs to its hash).
 */
export function useInternalTransfers(hash: string | null): [Internal, retry: () => void] {
  const [current, setCurrent] = useState<{ hash: string; state: Settled | null } | null>(null)
  const newest = useRef(0)

  const read = useCallback((h: string) => {
    const n = ++newest.current
    setCurrent({ hash: h, state: null })
    void load(h).then((state) => {
      if (newest.current === n) setCurrent({ hash: h, state })
    })
  }, [])

  useEffect(() => {
    if (hash) read(hash)
  }, [hash, read])

  const shown: Internal = !hash || current?.hash !== hash || !current.state ? { status: 'loading' } : current.state
  return [shown, () => hash && read(hash)]
}
