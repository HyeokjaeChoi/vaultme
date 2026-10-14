import { Stack, useLocalSearchParams } from 'expo-router'
import { RestoreDonePage } from '@/pages/restore/done'

export default function RestoreDoneRoute() {
  const { demo } = useLocalSearchParams<{ demo?: string }>()
  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <RestoreDonePage demo={__DEV__ && demo === '1'} />
    </>
  )
}
