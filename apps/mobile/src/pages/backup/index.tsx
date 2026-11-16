import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Platform, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { leavesReveal, protectPhrase, releasePhrase, startCheck } from '@/features/backup'
import { isAuthInProgress } from '@/shared/auth'
import { loadPhrase } from '@/shared/storage'
import { haptic } from '@/shared/lib/haptics'
import { goBack } from '@/shared/lib/nav'
import { useTheme } from '@/shared/theme'
import { Button, CheckRow, Screen, ScreenHeader, SecretGrid, StatusNotice, Text } from '@/shared/ui'
import { useAuthName } from '@/features/send'

const CAPTURE_KEY = 'backup-phrase'
const IOS = Platform.OS === 'ios'

// Dev-only fixture for design comparison: the public BIP-39 test vector ("abandon … about"), no keychain, never a real phrase (`/backup?demo=1`).
const DEMO_WORDS = [...Array.from({ length: 11 }, () => 'abandon'), 'about']

type Load = 'idle' | 'busy' | 'error'

/**
 * `view` = B-S61 복구 구문 다시 보기 (Figma 423:13856, from Settings): same screen without the "다 적었어요" footer and the word check.
 * B-S03 복구 구문 (Figma 423:13533 hidden -> 423:13622 revealed, B/Secret grid 426:2044). The phrase lives only in this screen's state:
 * it is loaded after OS auth, and cleared when the screen loses focus or the app leaves the foreground.
 * Capture is blocked and the iOS switcher snapshot blurred only while this screen is focused; the UI does not promise the block. No copy button.
 */
export function BackupPage({
  demo = false,
  view = false,
  revealed = false,
  checked = false,
}: {
  demo?: boolean
  view?: boolean
  revealed?: boolean
  checked?: boolean
}) {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const [words, setWords] = useState<string[] | null>(demo && revealed ? DEMO_WORDS : null)
  const [load, setLoad] = useState<Load>('idle')
  const [ack, setAck] = useState(demo && revealed && checked) // the one check row (S03): "12단어를 순서대로 종이에 적었어요". Only meaningful while revealed.
  const authName = useAuthName()
  const gen = useRef(0) // bumped on blur and background: an auth result from an older generation is dropped

  useFocusEffect(
    useCallback(() => {
      void protectPhrase(CAPTURE_KEY, IOS).catch(() => undefined) // reveal() protects again and fails closed
      return () => {
        void releasePhrase(CAPTURE_KEY, IOS).catch(() => undefined)
        gen.current++
        setWords(null)
        setAck(false)
        setLoad('idle')
      }
    }, []),
  )
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (leavesReveal(s, isAuthInProgress())) gen.current++
      if (s !== 'active') {
        setWords(null) // re-hide whenever the app leaves the foreground (owner 2026-10-17)
        setAck(false)
      }
    })
    return () => sub.remove()
  }, [])

  const reveal = async () => {
    if (demo) {
      setWords(DEMO_WORDS)
      return
    }
    setLoad('busy')
    const g = gen.current
    try {
      await protectPhrase(CAPTURE_KEY, IOS) // never reveal unless the capture block and the iOS switcher blur are in place
    } catch {
      setLoad('error')
      return
    }
    const r = await loadPhrase({ title: t('backup.authPrompt'), cancel: t('common.cancel') })
    // Only gen says the user left: AppState.currentState right after auth can still be the auth sheet's state (L04).
    if (g !== gen.current) {
      setLoad('idle') // left the screen or app meanwhile: never show it
      return
    }
    if (r.status === 'ok') {
      setWords(r.mnemonic.reveal().split(' '))
      setLoad('idle')
    } else setLoad(r.status === 'error' ? 'error' : 'idle') // cancelled: stay hidden, say nothing
  }

  const done = () => {
    if (!words) return
    startCheck(words)
    router.push(demo ? '/backup/check?demo=1' : '/backup/check')
  }

  const body = view ? t('settings.phraseBody', { auth: t(`settings.phraseAuth.${authName}`) }) : t('backup.body')
  return (
    <Screen
      gap="group"
      topGap="none"
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack()} />}
      {...(view ? {} : { footer: <Button label={t('backup.done')} disabled={!words || !ack} onPress={done} /> })}
    >
      <View
        style={{
          gap: th.semantic.layout.fieldGap,
          paddingTop: th.primitive.space[2],
          paddingBottom: th.semantic.layout.groupGap,
        }}
      >
        <Text variant="title1" accessibilityRole="header">
          {t('backup.title')}
        </Text>
        <Text variant="bodySmall" color={th.semantic.text.secondary}>
          {body}
        </Text>
      </View>
      <SecretGrid
        words={words}
        onReveal={() => void reveal()}
        revealLabel={t('backup.reveal')}
        busy={load === 'busy'}
      />
      {words && !view ? (
        <CheckRow
          title={t('backup.ack')}
          checked={ack}
          onToggle={() => {
            haptic.select()
            setAck((v) => !v)
          }}
        />
      ) : null}
      {load === 'error' ? (
        <StatusNotice
          tier="banner"
          tone="danger"
          title={t('backup.loadError.title')}
          body={t('backup.loadError.body')}
        />
      ) : null}
      <StatusNotice
        tone="warning"
        title={`${words || view ? t('backup.warnTitle') : t('backup.revealHint')}\n${t('backup.warnBody')}`}
      />
    </Screen>
  )
}
export { BackupCheckPage } from './check'
export { BackupCheckRoute } from './checkRoute'
