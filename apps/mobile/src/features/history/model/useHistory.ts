import { useFocusEffect } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import { api, createHistory, historyCache } from '@/shared/api'
import { readPendingTx } from '@/features/send/model/usePendingTx'
import { getAccountAddress } from '@/shared/storage'
import { failedView, toView, type HistoryView } from './view'

const client = api
const history = client
  ? createHistory({ fetchPage: (a, c) => client.history(a, c), cache: historyCache, local: () => [], now: Date.now })
  : null

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
    if (!history || !address) return setView(toView({ source: 'local', sent: [] }, local, Date.now()))
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
