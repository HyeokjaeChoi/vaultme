import { useLastNotificationResponse } from 'expo-notifications'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { routeForPush, syncPush } from './model/push'
import { installForegroundHandler, pushDeps } from './notifications'

/** Mounted once under the lock gate (kv is open): foreground handler, launch sync, and the tap route. Covers a cold start through the last response. */
export function usePushBoot(): void {
  const router = useRouter()
  const last = useLastNotificationResponse()
  useEffect(() => {
    installForegroundHandler()
    void syncPush(pushDeps)
  }, [])
  const id = last?.notification.request.identifier
  useEffect(() => {
    if (!last) return
    const href = routeForPush(last.notification.request.content.data)
    if (href) router.push(href as never)
  }, [id]) // one route per notification, not per render
}
