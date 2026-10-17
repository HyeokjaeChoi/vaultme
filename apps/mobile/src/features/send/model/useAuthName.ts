import { useEffect, useState } from 'react'
import { biometryType } from '@/shared/storage'
import { authNameOf, type AuthName } from './authName'

/** Auth name of this device. Starts as the generic "기기 인증" until the capability is read; a failed read keeps it. */
export function useAuthName(): AuthName {
  const [name, setName] = useState<AuthName>('device')
  useEffect(() => {
    biometryType().then((t) => setName(authNameOf(t)), () => undefined)
  }, [])
  return name
}
