import { Stack, useLocalSearchParams } from 'expo-router'
import { RestoreDonePage } from '@/pages/restore/done'

export default function RestoreDoneRoute() {
  const { demo, copied } = useLocalSearchParams<{ demo?: string; copied?: string }>()
  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <RestoreDonePage key={copied ?? ''} demo={__DEV__ && demo === '1'} copiedDemo={__DEV__ && copied === '1'} />
    </>
  )
}
