import type { HistoryItem, HistoryView } from '@vaultme/history'
import { useCallback, useEffect, useRef, useState } from 'react'

/** `more`: the state of the 더 보기 request. `failed` keeps the rows and the cursor, so a second try asks for the same page. */
export type History =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'ok'; items: HistoryItem[]; nextCursor: string | null; more: 'idle' | 'loading' | 'failed' }

type Ok = Extract<History, { status: 'ok' }>
type Settled = Exclude<History, { status: 'loading' }>

// The history module and the API client load on first read, not with the page (same reason as useBalances).
async function historyModule() {
  const [{ api }, { createHistory }] = await Promise.all([import('./client'), import('@vaultme/history')])
  // The web keeps no cache (ADR-0011: nothing is stored but the install key): every read asks the API.
  return createHistory({
    fetchPage: (a, cursor) => api().history(a, cursor),
    cache: { get: () => null, set: () => undefined },
    now: Date.now,
  })
}

async function first(address: string): Promise<Settled> {
  try {
    const h = await historyModule()
    const v = await new Promise<HistoryView>((resolve) => void h.list(resolve)(address))
    // No cache: a failed view has no rows. A 426 shows as failed here; the balances section already asks for a reload.
    return v.failed ? { status: 'failed' } : { status: 'ok', items: v.items, nextCursor: v.nextCursor, more: 'idle' }
  } catch {
    return { status: 'failed' } // a chunk that fails to load (offline, a newer deploy): retry imports it again
  }
}

async function older(address: string, cursor: string) {
  try {
    return await (await historyModule()).more(address, cursor)
  } catch {
    return null
  }
}

/**
 * The history of `address` through the shared module (`@vaultme/history`: contract check, poisoning filter, newest first).
 * Like useBalances, the read lives in a hook (a fragment-only navigation runs no loader) and each request gets a number:
 * only the newest one shows, so an answer for an address the user left, or an older retry, never replaces newer data.
 * The state is per request, not a Transition (React joins running Transitions into one `isPending`).
 */
export function useHistory(address: string | null): [History, { retry: () => void; more: () => void }] {
  const [current, setCurrent] = useState<{ address: string; state: Settled | null } | null>(null)
  const newest = useRef(0)

  const read = useCallback((a: string) => {
    const n = ++newest.current
    setCurrent({ address: a, state: null })
    void first(a).then((state) => {
      if (newest.current === n) setCurrent({ address: a, state })
    })
  }, [])

  useEffect(() => {
    if (address) read(address)
  }, [address, read])

  const shown: History =
    !address || current?.address !== address || !current.state ? { status: 'loading' } : current.state

  const more = () => {
    if (!address || shown.status !== 'ok' || !shown.nextCursor || shown.more === 'loading') return
    const n = ++newest.current // a new first read (read) takes a later number, so this answer is dropped then
    const before: Ok = shown
    setCurrent({ address, state: { ...before, more: 'loading' } })
    void older(address, shown.nextCursor).then((r) => {
      if (newest.current !== n) return
      const have = new Set(before.items.map((i) => i.id))
      setCurrent({
        address,
        state: r
          ? {
              status: 'ok',
              items: [...before.items, ...r.items.filter((i) => !have.has(i.id))],
              nextCursor: r.nextCursor,
              more: 'idle',
            }
          : { ...before, more: 'failed' },
      })
    })
  }

  return [shown, { retry: () => address && read(address), more }]
}
