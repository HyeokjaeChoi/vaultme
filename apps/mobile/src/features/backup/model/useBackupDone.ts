import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { getBackupDone } from '@/shared/storage'

/** Backup-done flag from the encrypted kv, re-read whenever the screen regains focus (S04 sets it, Home/Receive read it). */
const read = () => {
  try {
    return getBackupDone()
  } catch {
    return false // kv not open: treat as not backed up (hides the receive address, the safe side)
  }
}

export function useBackupDone(): boolean {
  const [done, setDone] = useState(read)
  useFocusEffect(useCallback(() => setDone(read()), []))
  return done
}
