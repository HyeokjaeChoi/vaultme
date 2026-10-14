import type { ReactNode } from 'react'
import { View } from 'react-native'
import { useUpdateRequired } from '@/shared/api'
import { UpdateRequiredPage } from '@/pages/update-required'

/**
 * 426 gate (S91): once any API call says this app version is unsupported, the app is replaced by the update screen.
 * It sits above the lock gate: nothing secret is shown, and no screen under it can be reached. The app stays mounted (hidden), like under the lock.
 */
export function UpdateGate({ children }: { children: ReactNode }) {
  const required = useUpdateRequired()
  return (
    <>
      <View style={{ flex: 1, display: required ? 'none' : 'flex' }}>{children}</View>
      {required ? <UpdateRequiredPage /> : null}
    </>
  )
}
