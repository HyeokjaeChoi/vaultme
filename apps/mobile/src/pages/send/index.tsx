import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { assets } from '@/entities/asset/fixtures'
import { review } from '@/entities/transaction/fixtures'
import { Button, Input, Screen, Text } from '@/shared/ui'
import { useTheme } from '@/shared/theme'

/** S20 보내기 입력 (static: no validation, no wallet-core) */
export function SendPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const [to, setTo] = useState<string>(review.recipient)
  const [amount, setAmount] = useState('0.5')
  return (
    <Screen footer={<Button label={t('send.review')} onPress={() => router.push('/review')} />}>
      <Input label={t('send.recipientLabel')} value={to} onChangeText={setTo} helper={t('send.recipientHint')} autoCapitalize="none" multiline />
      <Button label={t('send.scan')} variant="secondary" />
      <Input label={t('send.amountLabel')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" helper={`${t('send.maxSendable')} ${assets[0].balance} ETH`} />
      <Text color={th.semantic.text.secondary}>{t('send.feeReserve')}</Text>
    </Screen>
  )
}
