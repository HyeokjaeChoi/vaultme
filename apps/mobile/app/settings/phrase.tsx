import { useLocalSearchParams } from 'expo-router'
import { BackupPage } from '@/pages/backup'

// `?demo=1` is a __DEV__ design-capture override: the public BIP-39 test vector, no keychain.
export default function Route() {
  const { demo, revealed, checked } = useLocalSearchParams<{ demo?: string; revealed?: string; checked?: string }>()
  return <BackupPage view demo={__DEV__ && demo === '1'} revealed={revealed === '1'} checked={checked === '1'} />
}
