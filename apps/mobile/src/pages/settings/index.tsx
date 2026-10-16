// Figma: B-S60 Settings 423:13797 (B/Settings row 426:2045)
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { usePushSetting, useZeroSetting } from '@/features/settings'
import { useTheme } from '@/shared/theme'
import { ListItem, Screen, Text } from '@/shared/ui'

/** B-S60 설정: flat rows, each opens its own screen (value + chevron); 버전 is a plain value. */
export function SettingsPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const [push] = usePushSetting()
  const [zero] = useZeroSetting()
  return (
    <Screen edges={['top']} gap="section">
      <Text variant="title1" accessibilityRole="header" style={{ paddingTop: th.primitive.space[4] }}>{t('settings.title')}</Text>
      <View>
        <ListItem title={t('settings.phrase')} trailing={{ kind: 'disclosure' }} onPress={() => router.push('/settings/phrase')} />
        <ListItem title={t('settings.push')} trailing={{ kind: 'disclosure', text: push ? t('settings.on') : t('settings.off') }} onPress={() => router.push('/settings/push')} />
        <ListItem title={t('settings.zero')} trailing={{ kind: 'disclosure', text: zero ? t('settings.shown') : t('settings.hidden') }} onPress={() => router.push('/settings/zero')} />
        <ListItem title={t('settings.device')} trailing={{ kind: 'disclosure' }} onPress={() => router.push('/settings/device')} />
        <ListItem title={t('settings.network')} trailing={{ kind: 'disclosure', text: account.network }} />
        <ListItem title={t('settings.version')} trailing={{ kind: 'value', text: Constants.expoConfig?.version ?? '' }} />
      </View>
    </Screen>
  )
}
