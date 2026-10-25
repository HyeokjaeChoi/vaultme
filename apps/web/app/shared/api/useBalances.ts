import { formatAmount } from '@vaultme/wallet-core'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'

/** `update`: the API answered 426, this cached build is too old (ADR-0011: "새로고침해 주세요"). */
export type Balances =
  { status: 'loading' } | { status: 'ok'; ETH: string; USDC: string } | { status: 'failed' } | { status: 'update' }

type Settled = Exclude<Balances, { status: 'loading' }>

// The API client (zod schemas, WebCrypto signer, IndexedDB) loads on first read, not with the page: its preload before
// first paint pushed the mobile Lighthouse LCP of /en/address over 2.5 s in CI.
async function load(address: string): Promise<Settled> {
  let apiClient: typeof import('@vaultme/api-client') | undefined
  try {
    const [{ api }, m] = await Promise.all([import('./client'), import('@vaultme/api-client')])
    apiClient = m
    const b = await m.readBalances((method, params) => api().rpc(method, params), address)
    // Floor, never rounded up: the viewer never shows more than the address holds (wallet-core formatAmount).
    return { status: 'ok', ETH: formatAmount(b.ETH, 'ETH', 'floor'), USDC: formatAmount(b.USDC, 'USDC', 'floor') }
  } catch (e) {
    // A chunk that fails to load (offline, a newer deploy) is a failed load too: retry imports it again.
    return { status: apiClient?.isApiError(e, 'update_required') ? 'update' : 'failed' }
  }
}

/**
 * ETH and Sepolia USDC balances of `address` through the shared API client. The read runs in a Transition: `isPending`
 * is the loading state (the skeleton), first load and retry alike. The viewer state is the URL fragment, and a
 * fragment-only navigation runs no route loader in React Router (router.ts isHashChangeOnly), so the read lives here.
 */
export function useBalances(address: string | null): [Balances, retry: () => void] {
  const [settled, setSettled] = useState<{ address: string; balances: Settled } | null>(null)
  const [isPending, startTransition] = useTransition()
  const latest = useRef(address)
  useEffect(() => {
    latest.current = address
  }, [address])

  const read = useCallback((a: string) => {
    startTransition(async () => {
      const balances = await load(a)
      // A slower answer for an address the user already left must not show up for the new one.
      if (latest.current === a) startTransition(() => setSettled({ address: a, balances }))
    })
  }, [])

  useEffect(() => {
    if (address) read(address)
  }, [address, read])

  const state: Balances =
    !address || isPending || settled?.address !== address ? { status: 'loading' } : settled.balances
  return [state, () => address && read(address)]
}
