import { useAppStore } from '@/shared/app-store'

/** Backup-done flag from the app store (S04 sets it, Home/Receive read it). */
export const useBackupDone = (): boolean => useAppStore((s) => s.backupDone)
