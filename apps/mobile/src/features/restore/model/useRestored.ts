import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { getRestored } from '@/shared/storage'

const read = () => {
  try {
    return getRestored()
  } catch {
    return false // kv not open: treat as a new wallet (shows the backup notice, the safe side)
  }
}

/** True when this install's wallet came from a restore (kv flag). Not backup proof. Re-read on focus. */
export function useRestored(): boolean {
  const [restored, setRestored] = useState(read)
  useFocusEffect(useCallback(() => setRestored(read()), []))
  return restored
}
