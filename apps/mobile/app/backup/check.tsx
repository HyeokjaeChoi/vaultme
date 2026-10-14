import { useLocalSearchParams } from 'expo-router'
import { BackupCheckPage } from '@/pages/backup/check'
import { getCheck, startCheck } from '@/features/backup/model/check'

// Dev-only fixture for design comparison (`/backup/check?demo=1`): placeholder words, positions 3, 7, 11. No keychain, no real phrase.
const DEMO_WORDS = Array.from({ length: 12 }, (_, i) => `단어 ${i + 1}`)
const DEMO_RAND = [0.17, 0.5, 0.85]

export default function BackupCheckRoute() {
  const { demo } = useLocalSearchParams<{ demo?: string }>()
  const isDemo = __DEV__ && demo === '1'
  if (isDemo && !getCheck()) {
    let i = 0
    startCheck(DEMO_WORDS, () => DEMO_RAND[i++] ?? 0)
  }
  return <BackupCheckPage demo={isDemo} />
}
