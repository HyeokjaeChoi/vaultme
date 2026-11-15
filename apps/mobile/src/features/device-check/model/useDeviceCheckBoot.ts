import { useRouter } from 'expo-router'
import JailMonkey from 'jail-monkey'
import { useEffect } from 'react'
import { getDeviceWarningShown, setDeviceWarningShown } from '@/shared/storage'
import { shouldWarnDevice } from './deviceCheck'

/** Mounted once in the root navigator (kv is open): opens B-S92 once on a device jail-monkey flags as rooted or jailbroken. Advisory only (ADR-0050). */
export function useDeviceCheckBoot(): void {
  const router = useRouter()
  useEffect(() => {
    const warn = shouldWarnDevice({
      isRooted: () => JailMonkey.isJailBroken(),
      wasShown: getDeviceWarningShown,
      markShown: () => setDeviceWarningShown(true),
    })
    if (warn) router.push('/settings/device')
  }, [router])
}
