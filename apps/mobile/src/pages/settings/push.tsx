// Figma: B-S62 거래 알림 on 423:15349, off 652:108018, denied 652:108041, failed 664:109147 (List item Trailing=Switch 300:636, Notice Warning, Notice inline Danger)
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
import { Linking, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { disableTxPush, enableTxPush, readPushPermission, type Permission } from '@/features/push'
import { usePushSetting } from '@/features/settings'
import { haptic } from '@/shared/lib/haptics'
import { goBack } from '@/shared/lib/nav'
import { useTheme } from '@/shared/theme'
import { ListItem, Screen, ScreenHeader, StatusNotice, Switch, Text, TextLink } from '@/shared/ui'

/**
 * B-S62 거래 알림: one switch row, the privacy line under it, the anti-phishing notice. The switch is on only when the setting is on AND the OS allows notifications.
 * The OS said no: the switch is off and disabled, with a link to the device settings (the app cannot ask again).
 * A failed registration leaves the switch off with a danger notice under the row; turning the switch on again retries. `failed=1` shows that state (__DEV__ design capture).
 */
export function PushSettingPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const [stored, setStored] = usePushSetting()
  const [permission, setPermission] = useState<Permission>('undetermined')
  const [busy, setBusy] = useState(false)
  const { failed: failedParam } = useLocalSearchParams<{ failed?: string }>()
  const [failed, setFailed] = useState(__DEV__ && failedParam === '1')
  useFocusEffect(useCallback(() => void readPushPermission().then(setPermission), []))
  const denied = permission === 'denied'
  const on = stored && !denied
  const toggle = async (next: boolean) => {
    setBusy(true)
    setFailed(false)
    if (next) {
      const result = await enableTxPush()
      setStored(result === 'on')
      if (result === 'denied') setPermission('denied')
      else if (result !== 'on') {
        setFailed(true)
        haptic.error()
      }
    } else {
      await disableTxPush()
      setStored(false)
    }
    setBusy(false)
  }
  return (
    <Screen gap="section" header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack('/settings')} />}>
      <View style={{ gap: th.semantic.layout.fieldGap }}>
        <Text variant="title1" accessibilityRole="header">{t('settings.pushScreen.title')}</Text>
        <Text variant="body" color={th.semantic.text.secondary}>{t('settings.pushScreen.body')}</Text>
      </View>
      <View style={{ gap: th.semantic.layout.fieldGap }}>
        <ListItem title={t('settings.pushScreen.row')} trailing={{ kind: 'custom', node: <Switch label={t('settings.pushScreen.row')} value={on} disabled={denied || busy} onValueChange={(v) => void toggle(v)} /> }} />
        {denied ? (
          <View>
            <Text variant="bodySmall">{t('settings.pushScreen.denied')}</Text>
            <TextLink label={t('settings.pushScreen.openSettings')} onPress={() => void Linking.openSettings()} />
          </View>
        ) : null}
        {failed && !denied ? <StatusNotice tone="danger" title={t('settings.pushScreen.failed.title')} body={t('settings.pushScreen.failed.body')} /> : null}
        <Text variant="bodySmall" color={th.semantic.text.secondary} style={failed && !denied ? { paddingTop: th.semantic.layout.fieldGap } : undefined}>{t('settings.pushScreen.privacy')}</Text>
      </View>
      <StatusNotice tone="warning" title={t('settings.pushScreen.warnTitle')} body={t('settings.pushScreen.warnBody')} />
    </Screen>
  )
}
