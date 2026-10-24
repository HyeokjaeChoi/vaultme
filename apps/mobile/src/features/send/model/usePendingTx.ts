import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { readPendingTx } from '@/entities/transaction'
import type { PendingTx } from '@/shared/storage'
import { blocksNewSend } from './runSend'

/** Pending tx from the kv, re-read whenever the screen regains focus. `blocked` = ADR-0006. */
export function usePendingTx(): { tx: PendingTx | null; blocked: boolean; reload: () => void } {
  const [raw, setRaw] = useState(readPendingTx)
  const reload = useCallback(() => setRaw(readPendingTx()), [])
  useFocusEffect(reload)
  return { tx: raw === 'corrupt' ? null : raw, blocked: blocksNewSend(raw), reload }
}
