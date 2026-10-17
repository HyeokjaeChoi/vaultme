import * as Clipboard from 'expo-clipboard'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Keyboard, View, type TextInput } from 'react-native'
import { useTranslation } from 'react-i18next'
import { applyCellInput, emptyWords, inspectCells, joinWords, togglePassphrase, type WordCount } from '@/features/restore/model/cells'
import { holdRestore, takeWords } from '@/features/restore/model/handoff'
import { restoreWallet } from '@/features/restore/model/restoreWallet'
import { goBack } from '@/shared/lib/nav'
import { useTheme } from '@/shared/theme'
import { Button, Chip, Icon, Input, ListItem, Screen, ScreenHeader, StatusNotice, Text, WordCell } from '@/shared/ui'

/**
 * B-S05 지갑 복구 (Figma 423:15293 + 10 states, ux-flow §3): title + helper, 12/24 chips + 붙여넣기, numbered word cells in 2 columns
 * (column 1 = first half), one error line under the grid, collapsed "고급 · 패스프레이즈 입력" row, 복구 in the footer.
 * Words and passphrase live only in this component's state (and, for "다른 주소예요", in the in-memory hand-off): both are cleared on success,
 * on leaving the screen and when the app goes to the background. Collapsing the passphrase row clears the passphrase too.
 * Nothing is logged. Every cell and the passphrase field turn off auto-capitalize, auto-correct, spell check and autofill.
 */
/** `dev` is a __DEV__ design-capture preset (focus look without a keyboard, busy, a finished attempt, the passphrase row open). */
export type RestoreDev = { focus?: number; busy?: boolean; outcome?: 'exists' | 'error'; passOpen?: boolean; showPass?: boolean; passphrase?: string }
export function RestorePage({ initial, dev }: { initial?: { words: string[]; count: WordCount }; dev?: RestoreDev }) {
  const { t } = useTranslation()
  const router = useRouter()
  const th = useTheme()
  const [start] = useState(() => initial ?? takeWords() ?? { words: emptyWords(), count: 12 as WordCount }) // read once: the hand-off is consumed
  const [words, setWords] = useState(start.words)
  const [count, setCount] = useState<WordCount>(start.count)
  const [focus, setFocus] = useState<number | null>(dev?.focus ?? null)
  const [passOpen, setPassOpen] = useState(dev?.passOpen ?? false)
  const [passphrase, setPassphrase] = useState(dev?.passphrase ?? '')
  const [showPass, setShowPass] = useState(dev?.showPass ?? false)
  const [busy, setBusy] = useState(dev?.busy ?? false)
  const [outcome, setOutcome] = useState<'exists' | 'error' | null>(dev?.outcome ?? null)
  const [submitChecksum, setSubmitChecksum] = useState(false)

  const cells = useRef<(TextInput | null)[]>([])
  const reveal = useRef<((y: number | 'end', height?: number) => void) | null>(null)
  const phraseY = useRef(0)
  const gridY = useRef(0)
  const [focusReq, setFocusReq] = useState<{ i: number; n: number } | null>(null)
  const pasteId = useRef(0) // bumped on every leave: a clipboard read still in flight must not refill the cells

  const clearAll = useCallback(() => {
    pasteId.current++
    setWords(emptyWords())
    setPassphrase('')
    setPassOpen(false)
    setShowPass(false)
    setSubmitChecksum(false)
    setFocus(null)
  }, [])
  useFocusEffect(useCallback(() => clearAll, [clearAll]))
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') clearAll()
    })
    return () => sub.remove()
  }, [clearAll])

  const cellH = th.primitive.space[3] * 2 + th.primitive.type.productB.body.lineHeight
  const half = count / 2
  const revealCell = (i: number) => reveal.current?.(phraseY.current + gridY.current + (i % half) * (cellH + th.semantic.layout.fieldGap), cellH)
  useEffect(() => {
    // Opened passphrase row: bring the field and its helper above the footer (after the content has grown).
    if (passOpen) setTimeout(() => reveal.current?.('end'), 300)
  }, [passOpen])
  useEffect(() => {
    if (!focusReq) return
    cells.current[focusReq.i]?.focus()
  }, [focusReq])

  const state = inspectCells(words, count, focus)
  const showChecksum = state.badChecksum && (focus === null || submitChecksum)
  const firstUnknown = state.unknown[0]
  const message = firstUnknown !== undefined ? t('restore.unknownWord', { n: firstUnknown + 1 }) : showChecksum ? t('restore.badChecksum') : undefined

  const apply = (index: number, value: string) => {
    const r = applyCellInput(words, count, index, value)
    setWords(r.words)
    setCount(r.count)
    setSubmitChecksum(false)
    setOutcome(null)
    if (r.focus === null) Keyboard.dismiss()
    else if (r.focus !== index || r.count !== count) setFocusReq({ i: r.focus, n: (focusReq?.n ?? 0) + 1 })
  }
  const paste = async () => {
    const id = ++pasteId.current
    const clip = await Clipboard.getStringAsync()
    if (id === pasteId.current && AppState.currentState === 'active') apply(focus ?? 0, clip)
  }
  const go = (i: number) => setFocusReq({ i, n: (focusReq?.n ?? 0) + 1 })
  const toggleRow = () => {
    const r = togglePassphrase(passOpen, passphrase)
    setPassOpen(r.open)
    setPassphrase(r.passphrase)
    if (!r.open) setShowPass(false)
  }
  const submit = async () => {
    setBusy(true)
    setOutcome(null)
    const r = await restoreWallet(joinWords(words, count), { title: t('restore.authPrompt'), cancel: t('common.cancel') }, passOpen ? passphrase : '')
    if (r.status === 'ok') {
      holdRestore(words, count, passOpen && passphrase !== '') // memory only, for S06 "다른 주소예요"
      clearAll()
      router.replace('/restore/done')
      return
    }
    setBusy(false)
    if (r.status === 'invalid') setSubmitChecksum(true)
    else setOutcome(r.status)
  }

  const column = (from: number, to: number) => (
    <View style={{ flex: 1, gap: th.semantic.layout.fieldGap }}>
      {Array.from({ length: to - from }, (_, k) => from + k).map((i) => (
        <WordCell
          key={i}
          number={i + 1}
          label={t('restore.word', { n: i + 1 })}
          value={words[i]!}
          focused={focus === i}
          error={state.unknown.includes(i)}
          last={i === count - 1}
          inputRef={(r) => {
            cells.current[i] = r
          }}
          onChangeText={(v) => apply(i, v)}
          onFocus={() => {
            setFocus(i)
            revealCell(i)
          }}
          onBlur={() => setFocus((f) => (f === i ? null : f))}
          onNext={() => (i + 1 < count ? go(i + 1) : Keyboard.dismiss())}
          onBackspaceEmpty={() => i > 0 && go(i - 1)}
        />
      ))}
    </View>
  )

  return (
    <Screen
      revealRef={reveal}
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack('/')} />}
      footer={<Button label={t('restore.submit')} disabled={!state.ready || showChecksum} busy={busy} busyLabel={t('busy.restore')} onPress={() => void submit()} />}
    >
      <View style={{ gap: th.semantic.layout.fieldGap }}>
        <Text variant="title1" accessibilityRole="header">{t('restore.title')}</Text>
        <Text variant="body" color={th.semantic.text.secondary}>{t('restore.helper')}</Text>
        {outcome === 'exists' ? <StatusNotice tone="danger" tier="banner" title={t('restore.exists.title')} body={t('restore.exists.body')} /> : null}
        {outcome === 'error' ? <StatusNotice tone="danger" tier="banner" title={t('restore.saveError.title')} body={t('restore.saveError.body')} /> : null}
      </View>
      <View style={{ gap: th.semantic.layout.rowGap }} onLayout={(e) => (phraseY.current = e.nativeEvent.layout.y)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: th.semantic.layout.fieldGap }}>
            <Chip label={t('restore.count12')} selected={count === 12} onPress={() => setCount(12)} />
            <Chip label={t('restore.count24')} selected={count === 24} onPress={() => setCount(24)} />
          </View>
          <Button label={t('restore.paste')} variant="ghost" size="sm" link onPress={() => void paste()} />
        </View>
        <View style={{ gap: th.semantic.layout.rowGap }}>
          <View style={{ flexDirection: 'row', gap: th.semantic.layout.fieldGap }} onLayout={(e) => (gridY.current = e.nativeEvent.layout.y)}>
            {column(0, half)}
            {column(half, count)}
          </View>
          {message ? <Text variant="bodySmall" color={th.component.input.errorText} accessibilityRole="alert">{message}</Text> : null}
        </View>
      </View>
      <View>
        <ListItem
          title={t('restore.passphrase.row')}
          trailing={{ kind: 'custom', node: <Icon name={passOpen ? 'collapse' : 'expand'} size={th.component.icon.size.control} color={th.component.listItem.icon} /> }}
          onPress={toggleRow}
        />
        {passOpen ? (
          <Input
            label={t('restore.passphrase.label')}
            value={passphrase}
            onChangeText={setPassphrase}
            helper={t('restore.passphrase.helper')}
            secureTextEntry={!showPass}
            action={{ icon: showPass ? 'eyeClosed' : 'eye', label: showPass ? t('restore.passphrase.hide') : t('restore.passphrase.show'), onPress: () => setShowPass(!showPass) }}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
          />
        ) : null}
        {passOpen ? <Text variant="caption" color={th.semantic.text.tertiary} style={{ paddingTop: th.primitive.space[2] }}>{t('restore.passphrase.clearNote')}</Text> : null}
      </View>
    </Screen>
  )
}
