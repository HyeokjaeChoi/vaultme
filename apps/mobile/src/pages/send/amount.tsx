import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import Animated from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import { assets } from '@/entities/asset/fixtures'
import { applyKey, exceedsBalance, isZeroAmount } from '@/shared/lib/amount'
import { isAddressFormat, shortAddress } from '@/shared/lib/address'
import { useTheme } from '@/shared/theme'
import { useFoldIn } from '@/shared/theme/motion'
import { Button, Group, Keypad, Screen, ScreenHeader, SummaryRow, Text } from '@/shared/ui'
import { goBack } from '@/shared/lib/nav'

/** R-S20B 얼마를 보낼까요? Amount step. The recipient answer folds into a summary row above the question. 최대 fills the fixture spendable balance. */
export function SendAmountPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const { to } = useLocalSearchParams<{ to?: string }>()
  const [amount, setAmount] = useState('0.05')
  const fold = useFoldIn(th.primitive.space[2])
  const available = assets[0].balance
  const tooMuch = exceedsBalance(amount, available)
  const gap = th.semantic.layout.fieldGap
  if (!to || !isAddressFormat(to)) return <Redirect href="/send" />
  return (
    <Screen
      topGap="group"
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack()} />}
      footer={<Button label={t('send.next')} disabled={isZeroAmount(amount) || tooMuch} onPress={() => router.push({ pathname: '/review', params: { to, amount } })} />}
    >
      <View style={{ flex: 1, justifyContent: 'space-between', gap: th.semantic.layout.sectionGap.product }}>
        <View style={{ gap: th.semantic.layout.groupGap }}>
          <Animated.View style={fold}>
            <Group>
              <SummaryRow label={t('send.recipientLabel')} value={shortAddress(to)} mono editLabel={t('common.edit')} onEdit={() => goBack()} />
            </Group>
          </Animated.View>
          <Text variant="title" accessibilityRole="header">{t('send.amountQuestion')}</Text>
        </View>
        <View style={{ alignItems: 'center', gap }}>
          <View accessible accessibilityLabel={`${amount} ETH`} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'center', gap }}>
            <Text variant="amountHero">{amount}</Text>
            <Text variant="title" color={th.semantic.text.secondary}>ETH</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap }}>
            <Text variant="body" style={{ textAlign: 'center' }} color={th.semantic.text.secondary}>{`${t('send.maxSendable')} ${available} ETH`}</Text>
            <Button label={t('send.max')} variant="secondary" size="sm" style={{ minWidth: th.primitive.space[10] + th.primitive.space[8] }} onPress={() => setAmount(available)} />
          </View>
          {tooMuch ? <Text variant="body" color={th.semantic.status.danger.fg} accessibilityLiveRegion="polite">{t('send.insufficient')}</Text> : null}
        </View>
        <Keypad labels={{ dot: t('send.keypad.dot'), delete: t('send.keypad.delete') }} onKey={(k) => setAmount((a) => applyKey(a, k))} />
      </View>
    </Screen>
  )
}
