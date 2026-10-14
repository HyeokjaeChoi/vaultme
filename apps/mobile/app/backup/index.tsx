import { useLocalSearchParams } from 'expo-router'
import { BackupPage } from '@/pages/backup'

export default function BackupRoute() {
  const { demo } = useLocalSearchParams<{ demo?: string }>()
  return <BackupPage demo={__DEV__ && demo === '1'} />
}
