import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { PushOptInSheet } from '@/features/push-optin/ui/PushOptInSheet'
import { Button, PlaceholderQr, ReceivePanel, Screen, ScreenHeader } from '@/shared/ui'
import { useTheme } from '@/shared/theme'

/** S30 받기. QR is a labelled placeholder: no real QR is rendered (AGENTS rule 4). `sheet=1` opens S50. Copy and share are inert in C2a. */
export function ReceivePage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const { sheet } = useLocalSearchParams<{ sheet?: string }>()
  const [open, setOpen] = useState(sheet === '1')
  return (
    <Screen
      footer={
        <View style={{ flexDirection: 'row', gap: th.semantic.layout.fieldGap }}>
          <Button label={t('receive.copy')} variant="secondary" style={{ flex: 1 }} />
          <Button label={t('receive.share')} style={{ flex: 1 }} />
        </View>
      }
    >
      <ScreenHeader title={t('receive.title')} backLabel={t('common.back')} onBack={() => router.back()} />
      <View style={{ alignItems: 'center' }}>
        <PlaceholderQr note={t('receive.qrNote')} />
      </View>
      <ReceivePanel title={t('receive.addressLabel')} account={account.name} network={account.network} address={account.address} copyLabel={t('receive.copy')} note={t('receive.warning')} />
      <PushOptInSheet visible={open} onClose={() => setOpen(false)} />
    </Screen>
  )
}
