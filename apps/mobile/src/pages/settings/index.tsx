import Constants from 'expo-constants'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { useTheme } from '@/shared/theme'
import { ListItem, Screen, Text } from '@/shared/ui'

/** S60 설정. Rows are static in C2a (disclosure rows open nothing yet). */
export function SettingsPage() {
  const { t } = useTranslation()
  const th = useTheme()
  return (
    <Screen edges={['top']}>
      <View style={{ paddingTop: th.primitive.space[2] }}>
        <Text variant="h1" accessibilityRole="header">{t('settings.title')}</Text>
      </View>
      <View style={{ borderRadius: th.component.card.group.radius, overflow: 'hidden' }}>
        <ListItem title={t('settings.phrase')} trailing={{ kind: 'disclosure', text: t('settings.on') }} />
        <ListItem title={t('settings.push')} trailing={{ kind: 'disclosure', text: t('settings.on') }} />
        <ListItem title={t('settings.zero')} trailing={{ kind: 'disclosure', text: t('settings.hidden') }} />
        <ListItem title={t('settings.device')} trailing={{ kind: 'disclosure', text: t('settings.on') }} />
        <ListItem title={t('settings.network')} trailing={{ kind: 'value', text: account.network }} />
        <ListItem title={t('settings.version')} trailing={{ kind: 'value', text: Constants.expoConfig?.version ?? '' }} />
      </View>
    </Screen>
  )
}
