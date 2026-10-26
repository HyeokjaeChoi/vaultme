import type { InternalTransfer } from '@vaultme/api-client'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * `failed`: the read did not work (network, API, a bad answer, a build too old). It only affects the section, never the page.
 * `loading.again`: the read is a retry (the page is already shown), not the first one (the page waits for it, see `Detail`).
 */
export type Internal =
  { status: 'loading'; again: boolean } | { status: 'failed' } | { status: 'ok'; items: InternalTransfer[] }

type Settled = Exclude<Internal, { status: 'loading' }>

/**
 * The page waits for this read (see `Detail`), and the API client has no deadline of its own: a read that never answers is a failed
 * section after this long, so a stuck Etherscan call cannot hold the page.
 */
export const INTERNAL_DEADLINE_MS = 10_000

// Loads on first read, like useTransaction. A chunk that fails to load is a failed section too: retry imports it again.
async function load(hash: string): Promise<Settled> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const [{ api }, m] = await Promise.all([import('./client'), import('@vaultme/api-client')])
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('internal transfers: no answer')), INTERNAL_DEADLINE_MS)
    })
    const items = await Promise.race([m.readInternalTransfers((h) => api().txInternal(h), hash), deadline])
    return { status: 'ok', items }
  } catch {
    return { status: 'failed' }
  } finally {
    clearTimeout(timer)
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
