import { useLocalSearchParams } from 'expo-router'
import { getCheck, startCheck } from '@/features/backup'
import { BackupCheckPage } from './check'

// Dev-only fixture for design comparison (`/backup/check?demo=1`): the public BIP-39 test vector ("abandon … about"), positions 3, 7, 11. No keychain, no real phrase.
const DEMO_WORDS = [...Array.from({ length: 11 }, () => 'abandon'), 'about']
const DEMO_RAND = [0.17, 0.5, 0.85]

/** Route body of /backup/check, with the dev-only design-comparison fixture. */
export function BackupCheckRoute() {
  const { demo, state } = useLocalSearchParams<{ demo?: string; state?: string }>()
  const isDemo = __DEV__ && demo === '1'
  if (isDemo && !getCheck()) {
    let i = 0
    startCheck(DEMO_WORDS, () => DEMO_RAND[i++] ?? 0)
  }
  const PRESET: Record<string, { answers: string[]; wrong?: number[] }> = {
    typing: { answers: ['abandon', 'ab', ''] },
    filled: { answers: ['abandon', 'abandon', 'abandon'] },
    wrong: { answers: ['abandon', 'about', 'abandon'], wrong: [1] },
  }
  const preset = isDemo && state ? PRESET[state] : undefined
  return <BackupCheckPage demo={isDemo} key={state ?? ''} {...(preset ? { preset } : {})} />
}
