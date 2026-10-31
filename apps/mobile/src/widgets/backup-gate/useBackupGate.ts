import { useCallback } from 'react'
import { backupGateState, useBackupDone, type BackupGateState } from '@/features/backup'
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
      // kv write failed: the prompt may show again next launch, never block the sheet
    }
  }, [])
  const hasIncoming = !!view?.items.some((i) => i.kind === 'receive')
  return { ...backupGateState({ done, restored, hasIncoming, promptShown: shown }), markPromptShown }
}
