import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/shared/theme'
import { haptic } from '@/shared/lib/haptics'
import { View } from 'react-native'
import { Button, CheckRow, Screen, ScreenHeader, StatusNotice, Text } from '@/shared/ui'
import { goBack } from '@/shared/lib/nav'
import { createWallet } from '@/features/backup'

/** B-S02 시작하기 전에 확인해 주세요 (Figma 423:13478, checked 515:31398): three check rows; "지갑 만들기" stays disabled until all are checked. */
export function PrecheckPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const { checked } = useLocalSearchParams<{ checked?: string }>() // `?checked=1` is a __DEV__ capture override
  const [ack, setAck] = useState<boolean[]>(() =>
    __DEV__ && checked === '1' ? [true, true, true] : [false, false, false],
  )
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const alive = useRef(true)
  useEffect(
    () => () => {
      alive.current = false
    },
    [],
  )
  const create = async () => {
    setBusy(true)
    setFailed(false)
    try {
      await createWallet({ title: t('backup.authPromptSave'), cancel: t('common.cancel') })
      if (alive.current) router.replace('/home') // not if the user left while the OS auth sheet was open
    } catch {
      setBusy(false)
      setFailed(true) // keychain refused to save (e.g. no device passcode): stay here and say so
    }
  }
  return (
    <Screen
      gap="group"
      topGap="none"
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack('/')} />}
      footer={
        <Button
          label={t('precheck.cta')}
          busy={busy}
          busyLabel={t('busy.create')}
          disabled={!ack.every(Boolean)}
          onPress={() => void create()}
        />
      }
    >
      <View
        style={{
          gap: th.semantic.layout.fieldGap,
          paddingTop: th.primitive.space[2],
          paddingBottom: th.semantic.layout.groupGap,
        }}
      >
        <Text variant="title1" accessibilityRole="header">
          {t('precheck.title')}
        </Text>
        <Text variant="bodySmall" color={th.semantic.text.secondary}>
          {t('precheck.subtitle')}
        </Text>
      </View>
      {(['lose', 'scam', 'testnet'] as const).map((k, i) => (
        <CheckRow
          key={k}
          title={t(`precheck.${k}.title`)}
          body={t(`precheck.${k}.body`)}
          checked={ack[i] ?? false}
          onToggle={() => {
            haptic.select()
            setAck((a) => a.map((v, j) => (j === i ? !v : v)))
          }}
        />
      ))}
      {failed ? (
        <StatusNotice
          tier="banner"
          tone="danger"
          title={t('precheck.createError.title')}
          body={t('precheck.createError.body')}
        />
      ) : null}
    </Screen>
  )
}
