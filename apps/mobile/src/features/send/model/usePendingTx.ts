import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { getPendingTx, type PendingTx } from '@/shared/storage'
import { blocksNewSend } from './runSend'

/** Reads the kv record; a corrupt or unreadable one is `'corrupt'` so the send block stays on (Q47). */
export function readPendingTx(): PendingTx | null | 'corrupt' {
  try {
    return getPendingTx()
  } catch {
    return 'corrupt'
  }
}

/** Pending tx from the kv, re-read whenever the screen regains focus. `blocked` = Q47. */
export function usePendingTx(): { tx: PendingTx | null; blocked: boolean } {
  const [raw, setRaw] = useState(readPendingTx)
  useFocusEffect(useCallback(() => setRaw(readPendingTx()), []))
  return { tx: raw === 'corrupt' ? null : raw, blocked: blocksNewSend(raw) }
}
