import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { assets } from '@/entities/asset/fixtures'
import { review } from '@/entities/transaction/fixtures'
import { AmountField, Button, RecipientField, Screen, ScreenHeader } from '@/shared/ui'

/** S20 보내기 입력 (static: no validation, no wallet-core) */
export function SendPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [to, setTo] = useState<string>(review.recipient)
  const [amount, setAmount] = useState('0.05')
  return (
    <Screen footer={<Button label={t('send.review')} onPress={() => router.push('/review')} />}>
      <ScreenHeader title={t('send.title')} backLabel={t('common.back')} onBack={() => router.back()} />
      <RecipientField label={t('send.recipientLabel')} value={to} onChangeText={setTo} helper={t('send.recipientHint')} />
      <Button label={t('send.scan')} variant="ghost" />
      <AmountField label={t('send.amountLabel')} value={amount} onChangeText={setAmount} balance={`${t('send.maxSendable')} ${assets[0].balance} ETH`} note={t('send.feeReserve')} />
    </Screen>
  )
}
