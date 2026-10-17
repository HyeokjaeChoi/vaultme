import { useLocalSearchParams } from 'expo-router'
import { fromPhrase } from '@/features/restore/model/cells'
import { RestorePage, type RestoreDev } from '@/pages/restore'

// Dev-only fixtures for design comparison (`/restore?demo=<state>`): the public BIP39 test vector and the public Trezor test passphrase, no real phrase.
const A11 = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon'
const READY = `${A11} about`
const TYPING = 'abandon abandon abandon abandon aban'
const DEMO: Record<string, { phrase: string; dev?: RestoreDev }> = {
  empty: { phrase: '' },
  typing: { phrase: TYPING, dev: { focus: 4 } },
  ready: { phrase: READY },
  busy: { phrase: READY, dev: { busy: true } },
  unknown: { phrase: READY.replace('abandon abandon abandon', 'abandon abandon abandn') },
  checksum: { phrase: `${A11} abandon` },
  exists: { phrase: READY, dev: { outcome: 'exists' } },
  saveerror: { phrase: READY, dev: { outcome: 'error' } },
  'passphrase-masked': { phrase: READY, dev: { passOpen: true, passphrase: 'TREZOR' } },
  'passphrase-shown': { phrase: READY, dev: { passOpen: true, passphrase: 'TREZOR', showPass: true } },
  '24words': { phrase: `${'abandon '.repeat(17)}aban`, dev: { focus: 17 } },
}

export default function RestoreRoute() {
  const { demo } = useLocalSearchParams<{ demo?: string }>()
  const d = __DEV__ && demo ? DEMO[demo === '1' ? 'typing' : demo] : undefined
  const initial = d ? fromPhrase(d.phrase) : undefined
  return <RestorePage key={demo ?? ''} {...(initial ? { initial } : {})} {...(d?.dev ? { dev: d.dev } : {})} />
}
