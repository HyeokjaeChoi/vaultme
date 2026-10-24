import { useLocalSearchParams } from 'expo-router'
import type { ReactNode } from 'react'
import { useBackupGate } from './useBackupGate'

/** Route guard for the send flow (deep links too): not backed up -> the backup gate screen (Figma B-S31) in place of the flow. `backedUp=1` is a __DEV__ capture override. */
export function SendGuard({
  children,
  gate,
}: {
  children: ReactNode
  /** The S31 screen (a page, so this widget does not import UI from above). */ gate: ReactNode
}) {
  const { canSend } = useBackupGate()
  const { backedUp } = useLocalSearchParams<{ backedUp?: string }>()
  return <>{!canSend && !(__DEV__ && backedUp === '1') ? gate : children}</>
}
