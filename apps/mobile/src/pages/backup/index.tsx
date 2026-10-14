import { useFocusEffect, useRouter } from 'expo-router'
import { allowScreenCaptureAsync, preventScreenCaptureAsync } from 'expo-screen-capture'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { startCheck } from '@/features/backup/model/check'
import { loadPhrase } from '@/shared/storage'
import { goBack } from '@/shared/lib/nav'
import { useTheme } from '@/shared/theme'
import { Button, Screen, ScreenHeader, SensitiveReveal, StatusNotice, Text } from '@/shared/ui'

const CAPTURE_KEY = 'backup-phrase'

// Dev-only fixture for design comparison: placeholder words, no keychain, no real phrase (`/backup?demo=1`).
const DEMO_WORDS = Array.from({ length: 12 }, (_, i) => `단어 ${i + 1}`)

type Load = 'idle' | 'busy' | 'error'

/**
 * R-S03 복구 구문 (S03H hidden -> S03R revealed). The phrase lives only in this screen's state:
 * it is loaded after OS auth, and cleared when the screen loses focus or the app leaves the foreground (Q15).
 * Capture is blocked only while this screen is focused (Q43); the UI does not promise the block. No copy button.
 */
export function BackupPage({ demo = false }: { demo?: boolean }) {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const [words, setWords] = useState<string[] | null>(null)
  const [load, setLoad] = useState<Load>('idle')
  const gen = useRef(0) // bumped on blur and background: an auth result from an older generation is dropped

  useFocusEffect(
    useCallback(() => {
      void preventScreenCaptureAsync(CAPTURE_KEY)
      return () => {
        void allowScreenCaptureAsync(CAPTURE_KEY)
        gen.current++
        setWords(null)
        setLoad('idle')
      }
    }, []),
  )
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') gen.current++ // 'inactive' is also the OS auth sheet: it must not cancel the reveal
      if (s !== 'active') setWords(null)
    })
    return () => sub.remove()
  }, [])

  const reveal = async () => {
    if (demo) return setWords(DEMO_WORDS)
    setLoad('busy')
    const g = gen.current
    const r = await loadPhrase({ title: t('backup.authPrompt'), cancel: t('common.cancel') })
    if (g !== gen.current || AppState.currentState !== 'active') return setLoad('idle') // left the screen or app meanwhile: never show it
    if (r.status === 'ok') {
      setWords(r.mnemonic.reveal().split(' '))
      setLoad('idle')
    } else setLoad(r.status === 'error' ? 'error' : 'idle') // cancelled: stay hidden, say nothing
  }

  const done = () => {
    if (!words) return
    startCheck(words)
    router.push('/backup/check')
  }

  return (
    <Screen
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack()} />}
      footer={<Button label={t('backup.done')} disabled={!words} onPress={done} />}
    >
      <View style={{ gap: th.semantic.layout.fieldGap }}>
        <Text variant="title" accessibilityRole="header">{t('backup.title')}</Text>
        <Text variant="body" color={th.semantic.text.secondary}>{t('backup.body')}</Text>
      </View>
      <SensitiveReveal words={words} onReveal={() => void reveal()} hint={t('backup.revealHint')} busy={load === 'busy'} />
      {load === 'error' ? <StatusNotice tone="danger" title={t('backup.loadError.title')} body={t('backup.loadError.body')} /> : null}
      <StatusNotice tone="warning" title={t('backup.warnTitle')} body={t('backup.warnBody')} />
    </Screen>
  )
}
