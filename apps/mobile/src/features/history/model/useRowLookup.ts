import { useCallback, useEffect, useState } from 'react'
import type { PushDir, RowLookup } from '@vaultme/history'
import { goBack } from '@/shared/lib/nav'
import { accountAddress, history } from './loader'

const cachedLookup = (id: string, dir?: PushDir): RowLookup | null => {
  const row = history.cachedRow(accountAddress(), id, dir)
  return row ? { status: 'row', row } : null
}

/**
 * The history row an S41 route param names (see `history.findRow`). `null` = looking it up. A cached row shows on the first render, with no flash.
 * `retry` asks again; the Worker caches a history page for 30 s, so an immediate retry can get the same page.
 */
export function useRowLookup(id: string, dir?: PushDir): { lookup: RowLookup | null; retry: () => void } {
  const [lookup, setLookup] = useState<RowLookup | null>(() => cachedLookup(id, dir))
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    void history.findRow(accountAddress(), id, dir).then((r) => {
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
