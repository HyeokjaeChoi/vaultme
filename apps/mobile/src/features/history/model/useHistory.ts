import { useFocusEffect } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import type { HistoryView } from '@vaultme/history'
import { readPendingTx } from '@/entities/transaction'
import { history, listAddress } from './loader'

/** `null` until the first answer (loading); then the list state of S40. Real mode only (the fake adapter shows example rows). Reloads on focus. `reload` resets to loading; `refresh` (pull-to-refresh) keeps the current view until the new answer. */
export function useHistory(): { view: HistoryView | null; reload: () => void; refresh: () => Promise<void> } {
  const [view, setView] = useState<HistoryView | null>(null)
  const list = useMemo(() => history.list(setView), []) // only the newest load sets the view
  const load = useCallback(() => {
    const raw = readPendingTx()
    return list(listAddress(), raw === 'corrupt' ? null : raw) // update_required lands in the failed view; the client has already raised the S91 gate
  }, [list])
  const reload = useCallback(() => {
    setView(null)
    void load()
  }, [load])
  useFocusEffect(useCallback(() => void load(), [load]))
  return { view, reload, refresh: load }
}
