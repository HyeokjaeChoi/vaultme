import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/shared/theme'
import { haptic } from '@/shared/lib/haptics'
import { View } from 'react-native'
import { Button, CheckRow, Screen, ScreenHeader, StatusNotice, Text } from '@/shared/ui'
import { goBack } from '@/shared/lib/nav'
import { useDeviceLock } from '@/shared/lib/useDeviceLock'
import { classifySaveFailure } from '@/shared/auth'
import { createWallet } from '@/features/backup'

/**
 * B-S02 시작하기 전에 확인해 주세요 (Figma 423:13478, checked 515:31398): three check rows; "지갑 만들기" stays disabled until all are checked.
 * No device screen lock (Figma 808:2460 Android, 808:2536 iOS, #241): checked up front and on every return to the app; a warning banner
 * (Android: with a settings link) and a disabled button, because the phrase needs a screen lock (ADR-0004). A cancelled OS sheet shows nothing.
 */
export function PrecheckPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const { checked, lock: lockParam } = useLocalSearchParams<{ checked?: string; lock?: string }>() // `?checked=1`, `?lock=none` are __DEV__ capture overrides
  const [ack, setAck] = useState<boolean[]>(() =>
    __DEV__ && checked === '1' ? [true, true, true] : [false, false, false],
  )
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const lock = useDeviceLock()
  const noLock = lock.set === false || (__DEV__ && lockParam === 'none')
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
    } catch (e) {
      setBusy(false)
      const why = await classifySaveFailure(e) // keychain refused to save: only a real error gets the generic message
      if (why === 'noLock')
        void lock.refresh() // the up-front banner takes over
      else if (why === 'error') setFailed(true)
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
          disabled={!ack.every(Boolean) || noLock}
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
      {noLock ? (
        <StatusNotice
          tier="banner"
          tone="warning"
          title={t('deviceLock.title')}
          body={t(`deviceLock.create.${lock.canOpenSettings ? 'android' : 'ios'}`)}
          {...(lock.canOpenSettings ? { link: { label: t('deviceLock.link'), onPress: lock.openSettings } } : {})}
        />
      ) : null}
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
