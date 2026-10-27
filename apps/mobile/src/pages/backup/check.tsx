import { Redirect, useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Keyboard, Platform, View, type TextInputInstance } from 'react-native'
import { useTranslation } from 'react-i18next'
import { clearCheck, getCheck, wrongIndexes } from '@/features/backup'
import { setBackupDone } from '@/shared/storage'
import { at } from '@/shared/lib/at'
import { haptic } from '@/shared/lib/haptics'
import { goBack } from '@/shared/lib/nav'
import { useTheme } from '@/shared/theme'
import { Button, Input, Screen, ScreenHeader, Text } from '@/shared/ui'
import { NO_AUTOFILL } from '@/shared/ui'

/** R-S04 단어 확인. Asks the 3 positions picked by S03. Wrong: only the wrong cells turn Invalid with "N번째 단어가 달라요" (right cells stay), focus moves to the first wrong cell, one error haptic. Right: backup flag set, then Receive (S30) with Home beneath. */
/** `preset` is a __DEV__ design-capture state: typed answers and which cells are already judged wrong. */
export function BackupCheckPage({
  demo = false,
  preset,
}: {
  demo?: boolean
  preset?: { answers: string[]; wrong?: number[] }
}) {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const [session] = useState(getCheck) // read once: the hand-off is cleared on leave
  const [answers, setAnswers] = useState<string[]>(preset?.answers ?? ['', '', ''])
  const [wrong, setWrong] = useState<number[]>(preset?.wrong ?? []) // indexes of the cells judged wrong on the last confirm
  const cells = useRef<(TextInputInstance | null)[]>([])
  const reveal = useRef<((y: number | 'end', height?: number) => void) | null>(null) // form screen: keeps the footer above the keyboard
  const fieldsY = useRef(0)
  const cellBoxes = useRef<{ y: number; h: number }[]>([])
  const focused = useRef<number | null>(null)
  // The focused field (with its helper line) stays in view above the footer, also once the keyboard has finished opening.
  const revealFocused = useCallback(() => {
    const box = focused.current === null ? undefined : cellBoxes.current[focused.current]
    if (box) reveal.current?.(fieldsY.current + box.y, box.h)
  }, [])
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', revealFocused)
    return () => sub.remove()
  }, [revealFocused])

  useFocusEffect(useCallback(() => clearCheck, []))
  useEffect(() => {
    // Leaving the app drops the check and starts the backup over from S03 (nothing about the phrase lingers).
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'background') return
      clearCheck()
      setAnswers(['', '', ''])
      router.dismissTo('/backup')
    })
    return () => sub.remove()
  }, [router])
  if (!session) return <Redirect href="/backup" /> // restart or deep link: begin the backup again

  const filled = answers.every((a) => a.trim() !== '')
  const confirm = () => {
    const bad = wrongIndexes(session.words, answers)
    if (bad.length > 0) {
      setWrong(bad)
      haptic.error()
      cells.current[at(bad, 0)]?.focus()
      return
    }
    if (!demo) setBackupDone(true) // the dev fixture never records a real backup
    clearCheck()
    router.dismissTo('/home')
    router.push('/receive') // S04 ok -> S30; back from Receive lands on Home
  }

  return (
    <Screen
      revealRef={reveal}
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack('/backup')} />}
      footer={<Button label={t('backup.check.confirm')} disabled={!filled} onPress={confirm} />}
    >
      <View style={{ gap: th.semantic.layout.fieldGap }}>
        <Text variant="title1" accessibilityRole="header">
          {t('backup.check.title')}
        </Text>
        <Text variant="body" color={th.semantic.text.secondary}>
          {t('backup.check.body')}
        </Text>
      </View>
      <View style={{ gap: th.semantic.layout.groupGap }} onLayout={(e) => (fieldsY.current = e.nativeEvent.layout.y)}>
        {session.positions.map((p, i) => (
          <View
            key={p}
            onLayout={(e) => {
              cellBoxes.current[i] = { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height }
            }}
          >
            <Input
              label={t('backup.check.position', { n: p })}
              placeholder={t('backup.check.placeholder')}
              helper=" " // blank helper line reserves the space Figma draws under each field
              {...(wrong.includes(i) ? { error: t('backup.check.wrong', { n: p }) } : {})}
              inputRef={(r) => {
                cells.current[i] = r
              }}
              value={answers[i]}
              onChangeText={(v) => {
                setWrong((w) => w.filter((j) => j !== i))
                setAnswers((a) => a.map((x, j) => (j === i ? v : x)))
              }}
              {...NO_AUTOFILL}
              keyboardType={Platform.OS === 'android' ? 'visible-password' : 'ascii-capable'} // English words only, like the restore grid (WordCell)
              onFocus={() => {
                focused.current = i
                revealFocused()
              }}
            />
          </View>
        ))}
      </View>
    </Screen>
  )
}
