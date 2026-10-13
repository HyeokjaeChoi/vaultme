import Constants from 'expo-constants'
import { useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { ListItem, Screen, Switch, Text } from '@/shared/ui'

/** S60 설정 */
export function SettingsPage() {
  const { t } = useTranslation()
  const [push, setPush] = useState(true)
  const [zero, setZero] = useState(false)
  return (
    <Screen edges={['top']}>
      <Text variant="title" accessibilityRole="header">{t('settings.title')}</Text>
      <View>
        <ListItem title={t('settings.phrase')} trailing={{ kind: 'disclosure' }} divider />
        <ListItem title={t('settings.push')} trailing={{ kind: 'custom', node: <Switch label={t('settings.push')} value={push} onValueChange={setPush} /> }} divider />
        <ListItem title={t('settings.zero')} trailing={{ kind: 'custom', node: <Switch label={t('settings.zero')} value={zero} onValueChange={setZero} /> }} divider />
        <ListItem title={t('settings.device')} trailing={{ kind: 'disclosure' }} divider />
        <ListItem title={t('settings.network')} trailing={{ kind: 'value', text: account.network }} divider />
        <ListItem title={t('settings.version')} trailing={{ kind: 'value', text: Constants.expoConfig?.version ?? '' }} />
      </View>
    </Screen>
  )
}
