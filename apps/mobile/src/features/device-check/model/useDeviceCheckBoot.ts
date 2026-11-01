import { useRouter } from 'expo-router'
import { isRootedExperimentalAsync } from 'expo-device'
import { useEffect } from 'react'
import { getDeviceWarningShown, setDeviceWarningShown } from '@/shared/storage'
import { shouldWarnDevice } from './deviceCheck'

/** Mounted once in the root navigator (kv is open): opens B-S92 once on a device the experimental check flags as rooted or jailbroken. Warn only (ADR-0028). */
export function useDeviceCheckBoot(): void {
  const router = useRouter()
  useEffect(() => {
    void shouldWarnDevice({
      isRooted: isRootedExperimentalAsync,
      wasShown: getDeviceWarningShown,
      markShown: () => setDeviceWarningShown(true),
    }).then((warn) => {
      if (warn) router.push('/settings/device')
    })
  }, [router])
}
