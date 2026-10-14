import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { PushOptInSheet } from '@/features/push-optin/ui/PushOptInSheet'
import { BackupStatus, Button, PlaceholderQr, ReceivePanel, Screen, ScreenHeader, Text } from '@/shared/ui'
import { useTheme } from '@/shared/theme'
import { goBack } from '@/shared/lib/nav'

/**
 * R-S30 받기. QR is a labelled placeholder: no real QR is rendered (AGENTS rule 4). `sheet=1` opens S50. Copy and share are inert in C2a.
 * The address shows only with `backedUp=1` (ux-flow §3: no backup -> S31). Otherwise the backup notice shows instead.
 * ponytail: route param stands in for the stored backup state until C2b wires wallet-core state.
 */
export function ReceivePage() {
  const { t } = useTranslation()
  const th = useTheme()
  const { sheet, backedUp } = useLocalSearchParams<{ sheet?: string; backedUp?: string }>()
  const [open, setOpen] = useState(sheet === '1')
  if (backedUp !== '1') {
    return (
      <Screen header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack()} />}>
        <Text variant="title" accessibilityRole="header">{t('receive.title')}</Text>
        <BackupStatus title={t('home.backupTitle')} body={t('home.backupBody')} cta={t('home.backupCta')} />
      </Screen>
    )
  }
  return (
    <Screen
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack()} />}
      footer={
        <View style={{ flexDirection: 'row', gap: th.semantic.layout.fieldGap }}>
          <Button label={t('receive.copy')} variant="secondary" style={{ flex: 1 }} />
          <Button label={t('receive.share')} style={{ flex: 1 }} />
        </View>
      }
    >
      <Text variant="title" accessibilityRole="header">{t('receive.title')}</Text>
      <View style={{ alignItems: 'center' }}>
        <PlaceholderQr note={t('receive.qrNote')} />
      </View>
      <ReceivePanel account={account.name} network={account.network} address={account.address} note={t('receive.warning')} />
      <PushOptInSheet visible={open} onClose={() => setOpen(false)} />
    </Screen>
  )
}
