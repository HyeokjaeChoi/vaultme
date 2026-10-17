import { useCallback, useState } from 'react'
import { useHistory } from '@/features/history'
import { useRestored } from '@/features/restore'
import { getDepositPromptShown, setDepositPromptShown } from '@/shared/storage'
import { backupGateState, type BackupGateState } from './gate'
import { useBackupDone } from './useBackupDone'

const readShown = () => {
  try {
    return getDepositPromptShown()
  } catch {
    return true // kv not open: never prompt
  }
}

/** Single source for the Q14 backup timing. Call `markPromptShown()` when the deposit sheet opens (persisted once). */
export function useBackupGate(): BackupGateState & { markPromptShown: () => void } {
  const done = useBackupDone()
  const restored = useRestored()
  const { view } = useHistory()
  const [shown, setShown] = useState(readShown)
  const markPromptShown = useCallback(() => {
    try {
      setDepositPromptShown(true)
    } catch {
      // kv not open: the in-memory flag still stops a repeat this session
    }
    setShown(true)
  }, [])
  const hasIncoming = !!view?.items.some((i) => i.kind === 'receive')
  return { ...backupGateState({ done, restored, hasIncoming, promptShown: shown }), markPromptShown }
}
