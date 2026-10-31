import type { TxDetail } from '@vaultme/api-client'
import { useQuery } from '@tanstack/react-query'
import { UpdateRequiredError, queryClient, retryOf } from './query'

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

type Settled = Exclude<Tx, { status: 'loading' | 'failed' | 'update' }>

// The API client loads on first read, not with the page (same reason as useBalances).
async function load(hash: string, row?: Row): Promise<Settled> {
  let apiClient: typeof import('@vaultme/api-client') | undefined
  try {
    const [{ api }, m] = await Promise.all([import('./client'), import('@vaultme/api-client')])
    apiClient = m
    const tx = await m.readTransaction((method, params) => api().rpc(method, params), hash, row)
    return tx ? { status: 'ok', tx } : { status: 'notfound' }
  } catch (e) {
    // Also a chunk that fails to load (offline, a newer deploy): retry imports it again.
    throw apiClient?.isApiError(e, 'update_required') ? new UpdateRequiredError() : e
  }
}

/**
 * The transaction `hash` through the shared API client (`readTransaction`). Like useBalances: a query in a hook (a fragment-only
 * navigation runs no loader), keyed by hash and row, so an answer never shows for another hash or row.
 */
export function useTransaction(hash: string | null, row?: Row): [Tx, retry: () => void] {
  const queryKey = ['tx', hash, row ?? null]
  const retry = retryOf(queryKey)
  const q = useQuery({ queryKey, queryFn: () => load(hash ?? '', row), enabled: !!hash }, queryClient)
  const state: Tx =
    q.data ??
    (q.isError ? { status: q.error instanceof UpdateRequiredError ? 'update' : 'failed' } : { status: 'loading' })
  return [state, retry]
}
