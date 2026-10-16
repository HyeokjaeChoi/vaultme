import Constants from 'expo-constants'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { Group, ListItem, Screen, Switch, Text } from '@/shared/ui'

/** R-S60 설정. Preferences are local state only (no persistence in C2a); the recovery phrase row opens nothing yet. */
export function SettingsPage() {
  const { t } = useTranslation()
  const [push, setPush] = useState(true)
  const [zero, setZero] = useState(false)
  const [device, setDevice] = useState(true)
  const toggle = (title: string, value: boolean, set: (v: boolean) => void) => (
    <ListItem title={title} trailing={{ kind: 'custom', node: <Switch label={title} value={value} onValueChange={set} /> }} />
  )
  return (
    <Screen edges={['top']}>
      <Text variant="title1" accessibilityRole="header">{t('settings.title')}</Text>
      <Group inset={false}>
        <ListItem title={t('settings.phrase')} trailing={{ kind: 'disclosure' }} />
        {toggle(t('settings.push'), push, setPush)}
        {toggle(t('settings.zero'), zero, setZero)}
        {toggle(t('settings.device'), device, setDevice)}
        <ListItem title={t('settings.network')} trailing={{ kind: 'value', text: account.network }} />
        <ListItem title={t('settings.version')} trailing={{ kind: 'value', text: Constants.expoConfig?.version ?? '' }} />
      </Group>
    </Screen>
  )
}
