import type { InternalTransfer } from '@vaultme/api-client'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * `failed`: the read did not work (network, API, a bad answer, a build too old). It only affects the section, never the page.
 * `loading.again`: the read is a retry (the page is already shown), not the first one (the page waits for it, see `Detail`).
 */
export type Internal =
  { status: 'loading'; again: boolean } | { status: 'failed' } | { status: 'ok'; items: InternalTransfer[] }

type Settled = Exclude<Internal, { status: 'loading' }>

// Loads on first read, like useTransaction. A chunk that fails to load is a failed section too: retry imports it again.
async function load(hash: string): Promise<Settled> {
  try {
    const [{ api }, m] = await Promise.all([import('./client'), import('@vaultme/api-client')])
    return { status: 'ok', items: await m.readInternalTransfers((h) => api().txInternal(h), hash) }
  } catch {
    return { status: 'failed' }
  }
}

/**
 * The internal transfers of `hash` (`readInternalTransfers`, ADR-0015), read beside `useTransaction` and apart from it: a failure here
 * is the section's retry, not the page's. Same request numbering as `useTransaction` (only the newest read shows, state belongs to its hash).
 */
export function useInternalTransfers(hash: string | null): [Internal, retry: () => void] {
  const [current, setCurrent] = useState<{ hash: string; state: Settled | null; again: boolean } | null>(null)
  const newest = useRef(0)

  const read = useCallback((h: string, again: boolean) => {
    const n = ++newest.current
    setCurrent({ hash: h, state: null, again })
    void load(h).then((state) => {
      if (newest.current === n) setCurrent({ hash: h, state, again })
    })
  }, [])

  useEffect(() => {
    if (hash) read(hash, false)
  }, [hash, read])

  const shown: Internal =
    !hash || current?.hash !== hash
      ? { status: 'loading', again: false }
      : (current.state ?? { status: 'loading', again: current.again })
  return [shown, () => hash && read(hash, true)]
}
