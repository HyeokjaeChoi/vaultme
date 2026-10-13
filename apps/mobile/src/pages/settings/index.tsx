import Constants from 'expo-constants'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { Group, ListItem, Screen, Text } from '@/shared/ui'

/** R-S60 설정. Rows are static in C2a (disclosure rows open nothing yet). */
export function SettingsPage() {
  const { t } = useTranslation()
  return (
    <Screen edges={['top']}>
      <Text variant="title" accessibilityRole="header">{t('settings.title')}</Text>
      <Group inset={false}>
        <ListItem title={t('settings.phrase')} trailing={{ kind: 'disclosure', text: t('settings.on') }} />
        <ListItem title={t('settings.push')} trailing={{ kind: 'disclosure', text: t('settings.on') }} />
        <ListItem title={t('settings.zero')} trailing={{ kind: 'disclosure', text: t('settings.hidden') }} />
        <ListItem title={t('settings.device')} trailing={{ kind: 'disclosure', text: t('settings.on') }} />
        <ListItem title={t('settings.network')} trailing={{ kind: 'value', text: account.network }} />
        <ListItem title={t('settings.version')} trailing={{ kind: 'value', text: Constants.expoConfig?.version ?? '' }} />
      </Group>
    </Screen>
  )
}
