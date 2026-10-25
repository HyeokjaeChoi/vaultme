import { formatAmount } from '@vaultme/wallet-core'
import { useCallback, useEffect, useRef, useState } from 'react'

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
 * ETH and Sepolia USDC balances of `address` through the shared API client. The viewer state is the URL fragment, and a
 * fragment-only navigation runs no route loader in React Router (router.ts isHashChangeOnly), so the read lives here.
 * Each read gets a number and only the newest one shows: an older read (an address the user left, or the same address
 * before a retry or A -> B -> A) never replaces it. Not a Transition: React joins running Transitions into one
 * `isPending`, so a slow read the user left kept the next address on the skeleton.
 */
export function useBalances(address: string | null): [Balances, retry: () => void] {
  const [current, setCurrent] = useState<{ address: string; balances: Settled | null } | null>(null)
  const newest = useRef(0)

  const read = useCallback((a: string) => {
    const n = ++newest.current
    setCurrent({ address: a, balances: null })
    void load(a).then((balances) => {
      if (newest.current === n) setCurrent({ address: a, balances })
    })
  }, [])

  useEffect(() => {
    if (address) read(address)
  }, [address, read])

  const state: Balances =
    !address || current?.address !== address || !current.balances ? { status: 'loading' } : current.balances
  return [state, () => address && read(address)]
}
