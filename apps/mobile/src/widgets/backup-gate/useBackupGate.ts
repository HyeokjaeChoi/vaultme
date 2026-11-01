import { useCallback } from 'react'
import { backupGateState, hasDeposit, useBackupDone, type BackupGateState } from '@/features/backup'
import { useHistory } from '@/features/history'
import { useRestored } from '@/features/restore'
import { appStore, useAppStore } from '@/shared/app-store'

/** Single source for the backup timing. Call `markPromptShown()` when the deposit sheet opens (persisted once). */
export function useBackupGate(): BackupGateState & { markPromptShown: () => void } {
  const done = useBackupDone()
  const restored = useRestored()
  const { view } = useHistory()
  const shown = useAppStore((s) => s.depositPromptShown)
  const markPromptShown = useCallback(() => {
    try {
      appStore().getState().setDepositPromptShown(true)
    } catch {
      // kv write failed: keep the prompt off for this session in memory only (as before), so the sheet does not reopen each time; it may show again next launch
      appStore().setState({ depositPromptShown: true })
    }
  }, [])
  const hasIncoming = !!view && hasDeposit(view.items)
  return { ...backupGateState({ done, restored, hasIncoming, promptShown: shown }), markPromptShown }
}
