import { usePathname, useRouter } from 'expo-router'
import { useEffect } from 'react'
import { installForegroundHandler, onPushTap, pushDeps } from '../api/notifications'
import { launchDone, openPush, syncPush } from './push'

/** Mounted once in the root navigator (kv is open; the lock gate hides the app until unlock): foreground handler, launch sync, tap route. */
export function usePushBoot(): void {
  const router = useRouter()
  const launched = launchDone(usePathname())
  useEffect(() => {
    installForegroundHandler()
    void syncPush(pushDeps)
  }, [])
  // Cold start: wait for the `/` → `/home` redirect, else it replaces the opened S41 (#177). The tap stays in the OS until then.
  useEffect(() => (launched ? onPushTap((data) => void openPush(data, router)) : undefined), [launched, router])
}
