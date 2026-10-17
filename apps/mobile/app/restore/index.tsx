import { useLocalSearchParams } from 'expo-router'
import { RestorePage } from '@/pages/restore'

// Dev-only fixtures for design comparison (`/restore?demo=<state>`): wordlist words (the public test vector), no real phrase.
const A11 = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon'
const READY = `${A11} about`
const DEMO: Record<string, { initial: string; dev?: { blurred?: boolean; busy?: boolean; outcome?: 'exists' | 'error' } }> = {
  '1': { initial: 'abandon ability able' }, // typing
  typing: { initial: 'abandon ability able' },
  ready: { initial: READY },
  busy: { initial: READY, dev: { busy: true } },
  '2': { initial: 'abandon ability abcd ' },
  unknown: { initial: 'abandon abandon abandn abandon abandon abandon abandon abandon abandon abandon abandon about' },
  count: { initial: A11, dev: { blurred: true } },
  checksum: { initial: `${A11} abandon`, dev: { blurred: true } },
  exists: { initial: READY, dev: { outcome: 'exists' } },
  error: { initial: READY, dev: { outcome: 'error' } },
}

export default function RestoreRoute() {
  const { demo } = useLocalSearchParams<{ demo?: string }>()
  const d = __DEV__ && demo ? DEMO[demo] : undefined
  return <RestorePage key={demo ?? ''} initial={d?.initial ?? ''} {...(d?.dev ? { dev: d.dev } : {})} />
}
