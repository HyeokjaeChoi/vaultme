// Figma: B-S62 거래 알림 on 423:15349, off 652:108018, denied 652:108041 (List item Trailing=Switch 300:636)
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
import { AppState, Linking, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { disableTxPush, enableTxPush, readPushPermission, type Permission } from '@/features/push'
import { usePushSetting } from '@/features/settings'
import { goBack } from '@/shared/lib/nav'
import { useTheme } from '@/shared/theme'
import { ListItem, Screen, ScreenHeader, StatusNotice, Switch, Text, TextLink } from '@/shared/ui'

/**
 * B-S62 거래 알림: one switch row, the privacy line under it, the anti-phishing notice. The switch is on only when the setting is on AND the OS allows notifications.
 * The OS said no: the switch is off and disabled, with a link to the device settings (the app cannot ask again).
 * A failed registration leaves the switch off without a message: the failure state waits for its Figma frames (#81).
 * `variant=on|denied` seeds those states for __DEV__ design captures only (a real `on` needs a wallet and the OS permission).
 */
export function PushSettingPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const { variant: demo } = useLocalSearchParams<{ variant?: string }>()
  const [storedSetting, setStored] = usePushSetting()
  const stored = storedSetting || (__DEV__ && demo === 'on')
  const [permission, setPermission] = useState<Permission>('undetermined')
  const [busy, setBusy] = useState(false)
  // Re-read on focus and when the app comes back (설정 열기 leaves the app; the screen keeps focus).
  useFocusEffect(
    useCallback(() => {
      void readPushPermission().then(setPermission)
      const sub = AppState.addEventListener('change', (s) => {
        if (s === 'active') void readPushPermission().then(setPermission)
      })
      return () => sub.remove()
    }, []),
  )
  const denied = permission === 'denied' || (__DEV__ && demo === 'denied')
  const on = stored && !denied
  const toggle = async (next: boolean) => {
    setBusy(true)
    if (next) {
      const result = await enableTxPush()
      setStored(result === 'on')
      if (result === 'denied') setPermission('denied')
    } else {
      await disableTxPush()
      setStored(false)
    }
    setBusy(false)
  }
  return (
    <Screen gap="section" header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack('/settings')} />}>
      <View style={{ gap: th.semantic.layout.fieldGap }}>
        <Text variant="title1" accessibilityRole="header">
          {t('settings.pushScreen.title')}
        </Text>
        <Text variant="body" color={th.semantic.text.secondary}>
          {t('settings.pushScreen.body')}
        </Text>
      </View>
      <View style={{ gap: th.semantic.layout.fieldGap }}>
        <ListItem
          title={t('settings.pushScreen.row')}
          trailing={{
            kind: 'custom',
            node: (
              <Switch
                label={t('settings.pushScreen.row')}
                value={on}
                disabled={denied || busy}
                onValueChange={(v) => void toggle(v)}
              />
            ),
          }}
        />
        {denied ? (
          <View>
            <Text variant="bodySmall">{t('settings.pushScreen.denied')}</Text>
            <TextLink label={t('settings.pushScreen.openSettings')} onPress={() => void Linking.openSettings()} />
          </View>
        ) : null}
        <Text variant="bodySmall" color={th.semantic.text.secondary}>
          {t('settings.pushScreen.privacy')}
        </Text>
      </View>
      <StatusNotice
        tone="warning"
        title={t('settings.pushScreen.warnTitle')}
        body={t('settings.pushScreen.warnBody')}
      />
    </Screen>
  )
}
