import { useCallback, useEffect, useState } from 'react'
import { historyCache } from '@/shared/api'
import { goBack } from '@/shared/lib/nav'
import { getAccountAddress } from '@/shared/storage'
import { freshHistoryPage } from './loader'
import { resolveRow, rowFromCache, type PushDir, type RowLookup } from './detail'

const address = (): string | null => {
  try {
    return getAccountAddress()
  } catch {
    return null // kv unreadable
  }
}
const deps = { address, cache: historyCache.get, fresh: freshHistoryPage }

/**
 * The history row an S41 route param names (see `resolveRow`). `null` = looking it up. A cached row shows on the first render, with no flash.
 * `retry` asks again; the Worker caches a history page for 30 s, so an immediate retry can get the same page.
 */
export function useRowLookup(id: string, dir?: PushDir): { lookup: RowLookup | null; retry: () => void } {
  const [lookup, setLookup] = useState<RowLookup | null>(() => rowFromCache(id, address(), historyCache.get(), dir))
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    void resolveRow(id, deps, dir).then((r) => {
      if (!live) return
      setLookup(r)
      if (r.status === 'several') goBack('/activity') // one hash, several rows: which one is unknown, the list is below
    })
    return () => {
      live = false
    }
  }, [id, dir, attempt])
  const retry = useCallback(() => {
    setLookup(null)
    setAttempt((n) => n + 1)
  }, [])
  return { lookup, retry }
}
