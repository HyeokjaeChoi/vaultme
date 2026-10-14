import { useRouter } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { recents } from '@/entities/transaction/fixtures'
import { isAddressFormat, shortAddress } from '@/shared/lib/address'
import { useTheme } from '@/shared/theme'
import { Button, Group, ListItem, RecipientField, Screen, ScreenHeader, Text } from '@/shared/ui'
import { goBack } from '@/shared/lib/nav'

/** R-S20A 누구에게 보낼까요? Recipient step. 붙여넣기 and QR 스캔 are inert in C2a (no clipboard or camera wiring). */
export function SendPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const [to, setTo] = useState('')
  const valid = isAddressFormat(to)
  return (
    <Screen
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack()} />}
      footer={<Button label={t('send.next')} disabled={!valid} onPress={() => router.push({ pathname: '/send/amount', params: { to } })} />}
    >
      <Text variant="title" accessibilityRole="header">{t('send.recipientQuestion')}</Text>
      <View style={{ gap: th.semantic.layout.fieldGap }}>
        <RecipientField label={t('send.recipientLabel')} value={to} onChangeText={setTo} placeholder={t('send.recipientPlaceholder')} helper={valid ? t('send.recipientHint') : t('send.recipientHelper')} />
        <View style={{ flexDirection: 'row', gap: th.semantic.layout.fieldGap }}>
          <Button label={t('send.paste')} variant="secondary" size="sm" style={{ flex: 1 }} />
          <Button label={t('send.scan')} variant="secondary" size="sm" style={{ flex: 1 }} />
        </View>
      </View>
      <View style={{ gap: th.semantic.layout.rowGap }}>
        <Text variant="section" accessibilityRole="header">{t('send.recent')}</Text>
        <Group inset={false}>
          {recents.map((r) => (
            <ListItem key={r.address} mono title={shortAddress(r.address)} trailing={{ kind: 'value', text: t(r.label) }} onPress={() => setTo(r.address)} />
          ))}
        </Group>
      </View>
    </Screen>
  )
}
