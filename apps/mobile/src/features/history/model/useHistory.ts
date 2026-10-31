import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useFocusEffect } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import type { HistoryView } from '@vaultme/history'
import { historyKey, historyQuery } from './historyQuery'
import { listAddress } from './loader'

/**
 * `null` until the first answer (loading); then the list state of S40. Real mode only (the fake adapter shows example rows). Read with TanStack Query
 * (ADR-0021): Home, Activity and Asset share one view per account, and a returning screen shows the last view while it reloads. Reloads when the
 * screen regains focus (the first focus is the mount read) and when the app returns to the foreground. `reload` resets to loading; `refresh`
 * (pull-to-refresh, a state move on Home) keeps the current view until the new answer and drops a read already running, so the answer includes the
 * newest local send.
 */
export function useHistory(): { view: HistoryView | null; reload: () => void; refresh: () => Promise<void> } {
  const qc = useQueryClient()
  const [address, setAddress] = useState(listAddress)
  const first = useRef(true)
  const { data } = useQuery(historyQuery(address))
  // queryClient.query, not refetchQueries: after an address change the new query does not exist yet (same as the balances read).
  const read = useCallback((a: string | null) => qc.query(historyQuery(a)).then(() => undefined), [qc])
  useFocusEffect(
    useCallback(() => {
      const a = listAddress()
      setAddress(a) // a wallet removed or restored meanwhile
      if (first.current) first.current = false
      else void read(a)
    }, [read]),
  )
  const refresh = useCallback(async () => {
    const a = listAddress()
    setAddress(a)
    await qc.cancelQueries({ queryKey: historyKey(a), exact: true })
    await read(a)
  }, [qc, read])
  const reload = useCallback(() => {
    const a = listAddress()
    setAddress(a)
    void qc.resetQueries({ queryKey: historyKey(a), exact: true })
  }, [qc])
  return { view: data ?? null, reload, refresh }
}
