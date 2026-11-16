import { usePathname, useRouter } from 'expo-router'
import JailMonkey from 'jail-monkey'
import { useEffect } from 'react'
import { getDeviceWarningShown, setDeviceWarningShown } from '@/shared/storage'
import { shouldWarnDevice } from './deviceCheck'

// E2E builds (`.maestro/build-*.sh`) run on emulators, where jail-monkey flags test keys and `ro.debuggable`; the flows must reach the start screen.
const E2E = process.env.EXPO_PUBLIC_E2E === '1' // must be read as `process.env.EXPO_PUBLIC_*` so Expo inlines it

/**
 * Mounted once in the root navigator (kv is open): opens B-S92 once on a device jail-monkey flags as rooted or jailbroken. Advisory only (ADR-0048).
 * Cold start: waits for the `/` → `/home` redirect, else it replaces the opened screen (same rule as `usePushBoot`, #177). "Shown" is saved after the push.
 */
export function useDeviceCheckBoot(): void {
  const router = useRouter()
  const launched = usePathname() !== '/'
  useEffect(() => {
    if (E2E || !launched) return
    const warn = shouldWarnDevice({ isRooted: () => JailMonkey.isJailBroken(), wasShown: getDeviceWarningShown })
    if (!warn) return
    try {
      router.push('/settings/device')
      setDeviceWarningShown(true)
    } catch {
      // Advisory only: a failed push must never break the app. Not saved, so the next launch tries again.
    }
  }, [launched, router])
}
