import { useFocusEffect } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import { readPendingTx } from '@/entities/transaction'
import { getAccountAddress } from '@/shared/storage'
import { history } from './loader'
import { failedView, toView, type HistoryView } from './view'

/** `null` until the first answer (loading); then the list state of S40. Real mode only (the fake adapter shows example rows). Reloads on focus. `reload` resets to loading; `refresh` (pull-to-refresh) keeps the current view until the new answer. */
export function useHistory(): { view: HistoryView | null; reload: () => void; refresh: () => Promise<void> } {
  const [view, setView] = useState<HistoryView | null>(null)
  const seq = useRef(0)
  const load = useCallback(async () => {
    const id = ++seq.current // only the newest request may set the view
    const raw = readPendingTx()
    const local = raw === 'corrupt' ? null : raw
    let address: string | null = null
    try {
      address = getAccountAddress()
    } catch {
      // kv unreadable: no address, no API history
    }
    if (!history || !address) {
      setView(toView({ source: 'local', sent: [] }, local, Date.now()))
      return
    }
    try {
      const r = await history.load(address)
      if (id === seq.current) setView(toView(r, local, Date.now()))
    } catch {
      if (id === seq.current) setView(failedView(local)) // update_required also lands here; the client has already raised the S91 gate
    }
  }, [])
  const reload = useCallback(() => {
    setView(null)
    void load()
  }, [load])
  useFocusEffect(useCallback(() => void load(), [load]))
  return { view, reload, refresh: load }
}
