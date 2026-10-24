import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { installForegroundHandler, onPushTap, pushDeps } from '../api/notifications'
import { openPush, syncPush } from './push'

/** Mounted once in the root navigator (kv is open; the lock gate hides the app until unlock): foreground handler, launch sync, tap route. */
export function usePushBoot(): void {
  const router = useRouter()
  useEffect(() => {
    installForegroundHandler()
    void syncPush(pushDeps)
    return onPushTap((data) => void openPush(data, router))
  }, [router])
}
