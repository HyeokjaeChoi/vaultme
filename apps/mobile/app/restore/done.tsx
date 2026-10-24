import { Stack, useLocalSearchParams } from 'expo-router'
import { RestoreDonePage } from '@/pages/restore'

export default function RestoreDoneRoute() {
  const { demo, copied, passphrase } = useLocalSearchParams<{ demo?: string; copied?: string; passphrase?: string }>()
  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <RestoreDonePage
        key={`${copied ?? ''}${passphrase ?? ''}`}
        demo={__DEV__ && demo === '1'}
        copiedDemo={__DEV__ && copied === '1'}
        passphraseDemo={__DEV__ && passphrase === '1'}
      />
    </>
  )
}
