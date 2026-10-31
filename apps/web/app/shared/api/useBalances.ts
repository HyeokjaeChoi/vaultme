import { formatAmount } from '@vaultme/wallet-core'
import { useQuery } from '@tanstack/react-query'
import { UpdateRequiredError, queryClient, retryOf } from './query'

/** `update`: the API answered 426, this cached build is too old (ADR-0011: "새로고침해 주세요"). */
export type Balances =
  { status: 'loading' } | { status: 'ok'; ETH: string; USDC: string } | { status: 'failed' } | { status: 'update' }

type Ok = Extract<Balances, { status: 'ok' }>

// The API client (zod schemas, WebCrypto signer, IndexedDB) loads on first read, not with the page: its preload before
// first paint pushed the mobile Lighthouse LCP of /en/address over 2.5 s in CI.
async function load(address: string): Promise<Ok> {
  let apiClient: typeof import('@vaultme/api-client') | undefined
  try {
    const [{ api }, m] = await Promise.all([import('./client'), import('@vaultme/api-client')])
    apiClient = m
    const b = await m.readBalances((method, params) => api().rpc(method, params), address)
    // Floor, never rounded up: the viewer never shows more than the address holds (wallet-core formatAmount).
    return { status: 'ok', ETH: formatAmount(b.ETH, 'ETH', 'floor'), USDC: formatAmount(b.USDC, 'USDC', 'floor') }
  } catch (e) {
    // A chunk that fails to load (offline, a newer deploy) is a failed load too: retry imports it again.
    throw apiClient?.isApiError(e, 'update_required') ? new UpdateRequiredError() : e
  }
}

/**
 * ETH and Sepolia USDC balances of `address` through the shared API client (TanStack Query, ADR-0021). The viewer state is the
 * URL fragment, and a fragment-only navigation runs no route loader in React Router (router.ts isHashChangeOnly), so the read
 * lives in a hook. The query key holds the address: an answer belongs to its own address, so one the user left, or an older read
 * before a retry or A -> B -> A, never shows for another.
 */
export function useBalances(address: string | null): [Balances, retry: () => void] {
  const queryKey = ['balances', address]
  const retry = retryOf(queryKey)
  const q = useQuery({ queryKey, queryFn: () => load(address ?? ''), enabled: !!address }, queryClient)
  const state: Balances =
    q.data ??
    (q.isError ? { status: q.error instanceof UpdateRequiredError ? 'update' : 'failed' } : { status: 'loading' })
  return [state, retry]
}
