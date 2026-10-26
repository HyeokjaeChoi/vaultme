import * as IntentLauncher from 'expo-intent-launcher'
import { useCallback, useEffect, useState } from 'react'
import { AppState, Platform } from 'react-native'
import { deviceLockSet } from '../auth'

/**
 * Up-front screen-lock check (#241): `set` is null until the first answer. Asked on mount and every time the app returns to the
 * foreground (the user may have come back from settings). `refresh` re-asks now, e.g. after a refused save.
 * `openSettings` is Android only (`ActivityAction.SECURITY_SETTINGS`); iOS has no public deep link to the passcode settings, so `canOpenSettings` is false there.
 */
export function useDeviceLock() {
  const [set, setSet] = useState<boolean | null>(null)
  const refresh = useCallback(() => deviceLockSet().then(setSet), [])
  useEffect(() => {
    void refresh()
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refresh()
    })
    return () => sub.remove()
  }, [refresh])
  const openSettings = useCallback(() => {
    IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SECURITY_SETTINGS).catch(() => undefined)
  }, [])
  return { set, refresh, openSettings, canOpenSettings: Platform.OS === 'android' }
}
