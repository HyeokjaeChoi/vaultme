import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { installForegroundHandler, onPushTap, pushDeps } from '../api/notifications'
import { routeForPush, syncPush, type PushTapDeps } from './push'

/**
 * Mounted once in the root navigator (kv is open; the lock gate hides the app until unlock): foreground handler, launch sync, tap route.
 * `tap` comes from the shell (it may use the history feature; this feature may not). While the tap waits for the history page the
 * screen does not change; only the newest tap navigates, once.
 */
export function usePushBoot(tap: PushTapDeps): void {
  const router = useRouter()
  useEffect(() => {
    installForegroundHandler()
    void syncPush(pushDeps)
    let latest = 0
    const stop = onPushTap((data) => {
      const mine = ++latest
      void routeForPush(data, tap).then((href) => {
        if (href && mine === latest) router.push(href)
      })
    })
    return () => {
      latest++
      stop()
    }
  }, [router, tap])
}
