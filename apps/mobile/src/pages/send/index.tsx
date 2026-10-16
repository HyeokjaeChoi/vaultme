import * as Clipboard from 'expo-clipboard'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isAddressFormat } from '@/shared/lib/address'
import { goBack } from '@/shared/lib/nav'
import { Button, RecipientField, Screen, ScreenHeader, StatusNotice, Text } from '@/shared/ui'

/** R-S20A 누구에게 보낼까요? (Figma 423:848 empty, 423:885 valid). Paste fills the field from the clipboard; QR scan has no camera wiring yet, so it is not offered. A valid format only says the format is right. */
export function SendPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { to: initial } = useLocalSearchParams<{ to?: string }>()
  const [to, setTo] = useState(initial ?? '')
  const valid = isAddressFormat(to)
  const paste = async () => {
    try {
      setTo((await Clipboard.getStringAsync()).trim().replace(/\s/g, ''))
    } catch {
      // clipboard unavailable: the field stays as it is
    }
  }
  return (
    <Screen
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack()} />}
      footer={<Button label={t('send.next')} disabled={!valid} onPress={() => router.push({ pathname: '/send/amount', params: { to } })} />}
    >
      <Text variant="title1" accessibilityRole="header">{t('send.recipientQuestion')}</Text>
      <RecipientField label={t('send.recipientLabel')} value={to} onChangeText={setTo} placeholder={t('send.recipientPlaceholder')} actions={[{ label: t('send.paste'), onPress: () => void paste() }]} />
      {valid ? <StatusNotice tone="info" title={t('send.recipientHint')} /> : null}
    </Screen>
  )
}
