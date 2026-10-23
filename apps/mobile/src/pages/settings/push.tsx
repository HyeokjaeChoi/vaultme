// Figma: B-S62 거래 알림 423:15349 (List item Trailing=Switch 300:636)
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { usePushSetting } from '@/features/settings'
import { goBack } from '@/shared/lib/nav'
import { useTheme } from '@/shared/theme'
import { ListItem, Screen, ScreenHeader, StatusNotice, Switch, Text } from '@/shared/ui'

/** B-S62 거래 알림: one switch row, the anti-phishing notice under it. */
export function PushSettingPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const [on, setOn] = usePushSetting()
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
      <ListItem
        title={t('settings.pushScreen.row')}
        trailing={{
          kind: 'custom',
          node: <Switch label={t('settings.pushScreen.row')} value={on} onValueChange={setOn} />,
        }}
      />
      <StatusNotice
        tone="warning"
        title={t('settings.pushScreen.warnTitle')}
        body={t('settings.pushScreen.warnBody')}
      />
    </Screen>
  )
}
