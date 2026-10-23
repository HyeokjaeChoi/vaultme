// Figma: B-S63 0원 거래 표시 423:15384
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useZeroSetting } from '@/features/settings'
import { goBack } from '@/shared/lib/nav'
import { useTheme } from '@/shared/theme'
import { ListItem, Screen, ScreenHeader, Switch, Text } from '@/shared/ui'

/** B-S63 0원 거래 표시: one switch row (default off = hidden, Q71). */
export function ZeroSettingPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const [on, setOn] = useZeroSetting()
  return (
    <Screen gap="section" header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack('/settings')} />}>
      <View style={{ gap: th.semantic.layout.fieldGap }}>
        <Text variant="title1" accessibilityRole="header">
          {t('settings.zeroScreen.title')}
        </Text>
        <Text variant="body" color={th.semantic.text.secondary}>
          {t('settings.zeroScreen.body')}
        </Text>
      </View>
      <ListItem
        title={t('settings.zeroScreen.row')}
        trailing={{
          kind: 'custom',
          node: <Switch label={t('settings.zeroScreen.row')} value={on} onValueChange={setOn} />,
        }}
      />
    </Screen>
  )
}
