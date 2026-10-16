import * as Clipboard from 'expo-clipboard'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Platform, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { inspectPhrase, type PhraseIssue } from '@/features/restore/model/phrase'
import { restoreWallet } from '@/features/restore/model/restoreWallet'
import { goBack } from '@/shared/lib/nav'
import { Button, Input, Screen, ScreenHeader, StatusNotice, Text } from '@/shared/ui'

/**
 * R-S05 지갑 복구. One phrase field (12 or 24 words, counted from the text), 붙여넣기, no passphrase field (Q40: a notice only).
 * The typed phrase lives only in this component's state: it is cleared on success, on leaving the screen and when the app goes to the background.
 * Nothing about it is logged, and the field turns off every keyboard helper (autocorrect, suggestions, autofill).
 */
export function RestorePage({ initial = '' }: { initial?: string }) {
  const { t } = useTranslation()
  const router = useRouter()
  const [text, setText] = useState(initial)
  const [left, setLeft] = useState(false) // blurred once: judge the final shape (count, checksum) too
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<'exists' | 'error' | null>(null)
  const [submitIssue, setSubmitIssue] = useState<PhraseIssue | null>(null)

  const pasteId = useRef(0) // bumped on every leave: a clipboard read still in flight must not refill the field
  useFocusEffect(
    useCallback(
      () => () => {
        pasteId.current++
        setText('')
      },
      [],
    ),
  )
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') return
      pasteId.current++
      setText('')
    })
    return () => sub.remove()
  }, [])

  const state = inspectPhrase(text, left)
  const issue = state.issue ?? submitIssue
  const error = !issue
    ? undefined
    : issue.kind === 'unknownWord'
      ? t('restore.unknownWord', { word: issue.word })
      : issue.kind === 'wrongCount'
        ? t('restore.wrongCount', { count: issue.count })
        : t('restore.badChecksum')

  const change = (v: string) => {
    setText(v)
    setSubmitIssue(null)
    setOutcome(null)
    setLeft(false)
  }
  const paste = async () => {
    const id = ++pasteId.current
    const clip = await Clipboard.getStringAsync()
    if (id === pasteId.current && AppState.currentState === 'active') change(clip)
  }
  const submit = async () => {
    setBusy(true)
    setOutcome(null)
    const r = await restoreWallet(text, { title: t('restore.authPrompt'), cancel: t('common.cancel') })
    if (r.status === 'ok') {
      setText('')
      router.replace('/restore/done')
      return
    }
    setBusy(false)
    if (r.status === 'invalid') setSubmitIssue(r.issue)
    else setOutcome(r.status)
  }

  return (
    <Screen
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack('/')} />}
      footer={<Button label={t('restore.submit')} disabled={!state.ready || !!issue} busy={busy} onPress={() => void submit()} />}
    >
      <Text variant="title1" accessibilityRole="header">{t('restore.title')}</Text>
      <Input
        label={t('restore.label')}
        value={text}
        onChangeText={change}
        onBlur={() => setLeft(true)}
        helper={t('restore.helper')}
        {...(error ? { error } : {})}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        autoComplete="off"
        textContentType="none"
        importantForAutofill="no"
        {...(Platform.OS === 'android' ? { keyboardType: 'visible-password' as const } : {})}
      />
      <View style={{ flexDirection: 'row' }}>
        <Button label={t('restore.paste')} variant="secondary" size="sm" style={{ flex: 1 }} onPress={() => void paste()} />
      </View>
      <StatusNotice tone="warning" title={t('restore.passphrase.title')} body={t('restore.passphrase.body')} />
      {outcome === 'exists' ? <StatusNotice tone="danger" title={t('restore.exists.title')} body={t('restore.exists.body')} /> : null}
      {outcome === 'error' ? <StatusNotice tone="danger" title={t('restore.saveError.title')} body={t('restore.saveError.body')} /> : null}
    </Screen>
  )
}
