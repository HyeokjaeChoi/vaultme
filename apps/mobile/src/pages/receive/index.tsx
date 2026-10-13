import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { PushOptInSheet } from '@/features/push-optin/ui/PushOptInSheet'
import { useTheme } from '@/shared/theme'
import { AddressBlock, Button, Screen, StatusNotice, Text } from '@/shared/ui'

/** S30 받기. QR is a labeled placeholder: no real QR is rendered (AGENTS rule 4). `sheet=1` opens S50. */
export function ReceivePage() {
  const { t } = useTranslation()
  const th = useTheme()
  const { sheet } = useLocalSearchParams<{ sheet?: string }>()
  const [open, setOpen] = useState(sheet === '1')
  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: th.semantic.layout.fieldGap }}>
        <View
          accessible
          accessibilityLabel={t('receive.qrNote')}
          style={{ width: th.primitive.size.wallet_status_card, height: th.primitive.size.wallet_status_card, borderRadius: th.semantic.shape.group, backgroundColor: th.semantic.surface.subtle, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text variant="section" color={th.semantic.text.secondary}>{t('receive.qrPlaceholder')}</Text>
        </View>
        <Text color={th.semantic.text.secondary}>{t('receive.qrNote')}</Text>
      </View>
      <AddressBlock label={t('receive.addressLabel')} address={account.address} />
      <Text color={th.semantic.text.secondary}>{t('receive.accountNetwork')}</Text>
      <StatusNotice tone="warning" title={t('receive.warning')} />
      <View style={{ gap: th.semantic.layout.fieldGap }}>
        <Button label={t('receive.copy')} variant="secondary" />
        <Button label={t('receive.share')} variant="ghost" />
      </View>
      <PushOptInSheet visible={open} onClose={() => setOpen(false)} />
    </Screen>
  )
}
