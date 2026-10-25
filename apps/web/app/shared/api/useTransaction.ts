import type { TxDetail } from '@vaultme/api-client'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * `notfound`: the chain has no such transaction or no block for it yet. `failed`: the read did not work (network, API, a bad answer).
 * `update`: the API answered 426, this cached build is too old (ADR-0011: "새로고침해 주세요").
 */
export type Tx =
  | { status: 'loading' }
  | { status: 'notfound' }
  | { status: 'failed' }
  | { status: 'update' }
  | { status: 'ok'; tx: TxDetail }

/** The asset of the history row that opened the page: one transaction can have an ETH row and a USDC row. */
export type Row = 'ETH' | 'USDC'

type Settled = Exclude<Tx, { status: 'loading' }>

// The API client loads on first read, not with the page (same reason as useBalances).
async function load(hash: string, row?: Row): Promise<Settled> {
  let apiClient: typeof import('@vaultme/api-client') | undefined
  try {
    const [{ api }, m] = await Promise.all([import('./client'), import('@vaultme/api-client')])
    apiClient = m
    const tx = await m.readTransaction((method, params) => api().rpc(method, params), hash, row)
    return tx ? { status: 'ok', tx } : { status: 'notfound' }
  } catch (e) {
    if (apiClient?.isApiError(e, 'update_required')) return { status: 'update' }
    return { status: 'failed' } // also a chunk that fails to load (offline, a newer deploy): retry imports it again
  }
}

/**
 * The transaction `hash` through the shared API client (`readTransaction`). Like useBalances: the read lives in a hook because a
 * fragment-only navigation runs no loader, each read gets a number and only the newest shows (a hash the user left, or an older
 * retry, never replaces newer data), and the state belongs to the hash it was read for.
 */
export function useTransaction(hash: string | null, row?: Row): [Tx, retry: () => void] {
  const [current, setCurrent] = useState<{ key: string; state: Settled | null } | null>(null)
  const newest = useRef(0)

  const key = hash && `${hash}|${row ?? ''}`
  const read = useCallback((h: string, r: Row | undefined) => {
    const n = ++newest.current
    const k = `${h}|${r ?? ''}`
    setCurrent({ key: k, state: null })
    void load(h, r).then((state) => {
      if (newest.current === n) setCurrent({ key: k, state })
    })
  }, [])

  useEffect(() => {
    if (hash) read(hash, row)
  }, [hash, row, read])

  const shown: Tx = !key || current?.key !== key || !current.state ? { status: 'loading' } : current.state
  return [shown, () => hash && read(hash, row)]
}
