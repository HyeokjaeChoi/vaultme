import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import type { RowLookup } from '@vaultme/history'
import { goBack } from '@/shared/lib/nav'
import { accountAddress, history } from './loader'
import { rowLookupQuery } from './historyQuery'

const cachedLookup = (id: string): RowLookup | undefined => {
  const row = history.cachedRow(accountAddress(), id)
  return row ? { status: 'row', row } : undefined
}

/**
 * The history row an S41 route param names (see `history.findRow`). `null` = looking it up. A row in the seam cache shows on the first render, with
 * no flash, and is always the current one; any other answer (none, several, failed) shows only once this visit's lookup has finished, never an
 * older one. `retry` asks again; the Worker caches a history page for 30 s, so an immediate retry can get the same page.
 */
export function useRowLookup(id: string): { lookup: RowLookup | null; retry: () => void } {
  const qc = useQueryClient()
  const q = rowLookupQuery(id)
  const { data, isFetching, dataUpdatedAt } = useQuery(q)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- re-read the seam cache when a lookup finished (it may have stored a page)
  const cached = useMemo(() => cachedLookup(id), [id, dataUpdatedAt])
  const done = isFetching ? null : (data ?? null)
  useEffect(() => {
    if (done?.status === 'several') goBack('/activity') // one hash, several rows: which one is unknown, the list is below
  }, [done])
  const key = q.queryKey
  const retry = useCallback(() => void qc.resetQueries({ queryKey: key, exact: true }), [qc, key])
  return { lookup: cached ?? done, retry }
}
