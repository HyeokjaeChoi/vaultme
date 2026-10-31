import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import type { PushDir, RowLookup } from '@vaultme/history'
import { goBack } from '@/shared/lib/nav'
import { accountAddress, history } from './loader'
import { rowLookupQuery } from './historyQuery'

const cachedLookup = (id: string, dir?: PushDir): RowLookup | undefined => {
  const row = history.cachedRow(accountAddress(), id, dir)
  return row ? { status: 'row', row } : undefined
}

/**
 * The history row an S41 route param names (see `history.findRow`). `null` = looking it up. A cached row shows on the first render, with no flash;
 * an older answer that is not a row never shows while a new lookup runs. `retry` asks again; the Worker caches a history page for 30 s, so an
 * immediate retry can get the same page.
 */
export function useRowLookup(id: string, dir?: PushDir): { lookup: RowLookup | null; retry: () => void } {
  const qc = useQueryClient()
  const q = rowLookupQuery(id, dir)
  const { data, isFetching } = useQuery(q)
  const lookup = data ?? cachedLookup(id, dir) ?? null
  const shown = isFetching && lookup?.status !== 'row' ? null : lookup
  useEffect(() => {
    if (data?.status === 'several') goBack('/activity') // one hash, several rows: which one is unknown, the list is below
  }, [data])
  const key = q.queryKey
  const retry = useCallback(() => void qc.resetQueries({ queryKey: key, exact: true }), [qc, key])
  return { lookup: shown, retry }
}
