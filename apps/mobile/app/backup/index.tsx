import { useLocalSearchParams } from 'expo-router'
import { BackupPage } from '@/pages/backup'

export default function BackupRoute() {
  const { demo, revealed } = useLocalSearchParams<{ demo?: string; revealed?: string }>()
  return <BackupPage demo={__DEV__ && demo === '1'} revealed={revealed === '1'} />
}
