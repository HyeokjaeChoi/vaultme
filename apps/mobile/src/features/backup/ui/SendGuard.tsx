import { Redirect, useLocalSearchParams } from 'expo-router'
import type { ReactNode } from 'react'
import { sendHref } from '../model/gate'
import { useBackupGate } from '../model/useBackupGate'

/** Route guard for the send flow (deep links too): not backed up -> backup gate. `backedUp=1` is a __DEV__ capture override. */
export function SendGuard({ children }: { children: ReactNode }) {
  const { canSend } = useBackupGate()
  const { backedUp } = useLocalSearchParams<{ backedUp?: string }>()
  if (!canSend && !(__DEV__ && backedUp === '1')) return <Redirect href={sendHref(false) as '/backup'} />
  return <>{children}</>
}
