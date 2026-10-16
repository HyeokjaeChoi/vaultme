import { Redirect, useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { AppState, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { checkAnswers, clearCheck, getCheck } from '@/features/backup/model/check'
import { setBackupDone } from '@/shared/storage'
import { goBack } from '@/shared/lib/nav'
import { useTheme } from '@/shared/theme'
import { Button, Input, Screen, ScreenHeader, StatusNotice, Text } from '@/shared/ui'

/** R-S04 단어 확인. Asks the 3 positions picked by S03. Wrong: error text, stay. Right: backup flag set, then Receive (S30) with Home beneath. */
export function BackupCheckPage({ demo = false }: { demo?: boolean }) {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const [session] = useState(getCheck) // read once: the hand-off is cleared on leave
  const [answers, setAnswers] = useState<string[]>(['', '', ''])
  const [wrong, setWrong] = useState(false)

  useFocusEffect(useCallback(() => clearCheck, []))
  useEffect(() => {
    // Leaving the app drops the check and starts the backup over from S03 (Q15 spirit: nothing about the phrase lingers).
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
    if (!checkAnswers(session.words, answers)) return setWrong(true)
    if (!demo) setBackupDone(true) // the dev fixture never records a real backup
    clearCheck()
    router.dismissTo('/home')
    router.push('/receive') // ux-flow §4: S04 ok -> S30; back from Receive lands on Home
  }

  return (
    <Screen
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack('/backup')} />}
      footer={<Button label={t('backup.check.confirm')} disabled={!filled} onPress={confirm} />}
    >
      <View style={{ gap: th.semantic.layout.fieldGap }}>
        <Text variant="title1" accessibilityRole="header">{t('backup.check.title')}</Text>
        <Text variant="body" color={th.semantic.text.secondary}>{t('backup.check.body')}</Text>
      </View>
      <View style={{ gap: th.semantic.layout.groupGap }}>
        {session.positions.map((p, i) => (
          <Input
            key={p}
            label={t('backup.check.position', { n: p })}
            placeholder={t('backup.check.placeholder')}
            helper=" " // blank helper line reserves the space Figma draws under each field
            value={answers[i]}
            onChangeText={(v) => {
              setWrong(false)
              setAnswers((a) => a.map((x, j) => (j === i ? v : x)))
            }}
            autoCapitalize="none"
          />
        ))}
      </View>
      {wrong ? <StatusNotice tone="danger" title={t('backup.check.wrong')} /> : null}
    </Screen>
  )
}
