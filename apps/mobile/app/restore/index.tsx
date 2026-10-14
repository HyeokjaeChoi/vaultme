import { useLocalSearchParams } from 'expo-router'
import { RestorePage } from '@/pages/restore'

// Dev-only fixtures for design comparison (`/restore?demo=1|2`): wordlist words, no real phrase. 1 = S05 filled, 2 = S05E unknown word.
const DEMO = { '1': 'abandon ability able', '2': 'abandon ability abcd ' } as const

export default function RestoreRoute() {
  const { demo } = useLocalSearchParams<{ demo?: keyof typeof DEMO }>()
  return <RestorePage key={demo ?? ''} initial={__DEV__ && demo ? (DEMO[demo] ?? '') : ''} />
}
