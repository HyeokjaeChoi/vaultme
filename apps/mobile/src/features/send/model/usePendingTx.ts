import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { getPendingTx, setPendingTx, type PendingTx } from '@/shared/storage'
import { blocksNewSend } from './runSend'

// A submitted tx whose kv write failed. It keeps the Q47 block and the result screen alive until the app restarts.
let unsaved: PendingTx | null = null

/** Writes the kv record. If the write fails the tx is kept in memory, so a submitted send is never forgotten (Q47). */
export function writePendingTx(tx: PendingTx | null): void {
  try {
    setPendingTx(tx)
    unsaved = null
  } catch (e) {
    if (tx === null) throw e
    unsaved = tx
  }
}

/** Reads the kv record (or the unsaved one); a corrupt or unreadable one is `'corrupt'` so the send block stays on (Q47). */
export function readPendingTx(): PendingTx | null | 'corrupt' {
  try {
    return getPendingTx() ?? unsaved
  } catch {
    return unsaved ?? 'corrupt'
  }
}

/** Pending tx from the kv, re-read whenever the screen regains focus. `blocked` = Q47. */
export function usePendingTx(): { tx: PendingTx | null; blocked: boolean } {
  const [raw, setRaw] = useState(readPendingTx)
  useFocusEffect(useCallback(() => setRaw(readPendingTx()), []))
  return { tx: raw === 'corrupt' ? null : raw, blocked: blocksNewSend(raw) }
}
