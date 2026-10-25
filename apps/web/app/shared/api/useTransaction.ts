import type { TxDetail } from '@vaultme/api-client'
import { useCallback, useEffect, useRef, useState } from 'react'

/** `notfound`: the chain has no such transaction or no block for it yet. `failed`: the read did not work (network, API, a bad answer). */
export type Tx = { status: 'loading' } | { status: 'notfound' } | { status: 'failed' } | { status: 'ok'; tx: TxDetail }

type Settled = Exclude<Tx, { status: 'loading' }>

// The API client loads on first read, not with the page (same reason as useBalances).
async function load(hash: string): Promise<Settled> {
  try {
    const [{ api }, { readTransaction }] = await Promise.all([import('./client'), import('@vaultme/api-client')])
    const tx = await readTransaction((method, params) => api().rpc(method, params), hash)
    return tx ? { status: 'ok', tx } : { status: 'notfound' }
  } catch {
    return { status: 'failed' } // also a chunk that fails to load (offline, a newer deploy): retry imports it again
  }
}

/**
 * The transaction `hash` through the shared API client (`readTransaction`). Like useBalances: the read lives in a hook because a
 * fragment-only navigation runs no loader, each read gets a number and only the newest shows (a hash the user left, or an older
 * retry, never replaces newer data), and the state belongs to the hash it was read for.
 */
export function useTransaction(hash: string | null): [Tx, retry: () => void] {
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

  const shown: Tx = !hash || current?.hash !== hash || !current.state ? { status: 'loading' } : current.state
  return [shown, () => hash && read(hash)]
}
