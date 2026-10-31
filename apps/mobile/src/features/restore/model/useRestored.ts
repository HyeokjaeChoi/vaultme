import { useAppStore } from '@/shared/app-store'

/** True when this install's wallet came from a restore (store flag). Not backup proof. */
export const useRestored = (): boolean => useAppStore((s) => s.restored)
