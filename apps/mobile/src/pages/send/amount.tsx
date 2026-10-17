import { chipAmount, formatDecimal, fromUnits, maxSendable, type ChipShare } from '@vaultme/wallet-core'
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { cleanAmount } from '@/entities/transaction/review'
import { useSendable } from '@/features/send'
import { applyKey, type KeypadKey, exceedsBalance, isZeroAmount } from '@/shared/lib/amount'
import { isAddressFormat } from '@/shared/lib/address'
import { goBack } from '@/shared/lib/nav'
import { useTheme } from '@/shared/theme'
import { AmountDisplay, Button, Chip, Keypad, Screen, ScreenHeader, StatusNotice, Text } from '@/shared/ui'
import { NetworkChips } from '@/widgets/network-chips/NetworkChips'

const CHIPS = [
  { pct: 25, label: 'send.chip.p25' },
  { pct: 50, label: 'send.chip.p50' },
  { pct: 100, label: 'send.chip.all' },
] as const satisfies readonly { pct: ChipShare; label: string }[]

/**
 * R-S20B 얼마를 보낼까요? (Figma 423:929, 423:1000 전액, 423:1071 error). Custom keypad plus chips 25% / 50% / 전액.
 * Chips = share of the sendable amount (ETH: balance - max fee), floored to the display digits (wallet-core chipAmount).
 * This flow sends ETH only, so the asset key is "." (USDC would use "00" with `assetKey="doubleZero"`).
 */
export function SendAmountPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const { to, amount: initial } = useLocalSearchParams<{ to?: string; amount?: string }>()
  const [amount, setAmount] = useState(initial === undefined ? '0' : (cleanAmount(initial) ?? '0'))
  const snap = useSendable(to ?? '')
  if (!to || !isAddressFormat(to)) return <Redirect href="/send" />
  const max = snap ? maxSendable(snap.balance, 'ETH', snap.feeCap, snap.nativeBalance) : null
  const sendable = max?.ok ? fromUnits(max.amount, 'ETH') : null
  const tooMuch = sendable !== null && exceedsBalance(amount, sendable)
  const chips = CHIPS.map((c) => {
    const raw = snap ? chipAmount('ETH', c.pct, snap.balance, snap.feeCap, snap.nativeBalance) : 0n
    return { ...c, raw, value: fromUnits(raw, 'ETH') }
  })
  const onKey = (k: KeypadKey) => {
    const next = applyKey(amount, k)
    if (next === amount && k !== 'backspace') return false // over max length or decimals, second "."
    setAmount(next)
    return !(sendable !== null && !tooMuch && exceedsBalance(next, sendable)) // newly over the balance: warning cue
  }
  const chosen = chips.find((c) => c.raw > 0n && c.value === amount.replace(/\.$/, ''))
  const sub = chosen?.pct === 100 ? t('send.feeExcluded') : sendable !== null ? `${t('send.maxSendable')} ${formatDecimal(sendable, 'ETH', 'floor')} ETH` : undefined
  return (
    <Screen
      topGap="group"
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack()} chips={<NetworkChips />} />}
      footer={<Button label={t('send.review')} disabled={isZeroAmount(amount) || tooMuch} onPress={() => router.push({ pathname: '/review', params: { to, amount } })} />}
    >
      <View style={{ flex: 1, gap: th.semantic.layout.groupGap }}>
        <Text variant="title1" accessibilityRole="header">{t('send.amountQuestion')}</Text>
        <View style={{ flex: 1 }}>
          <AmountDisplay amount={amount} ticker="ETH" error={tooMuch} {...(sub && !tooMuch ? { sub } : {})} />
          {tooMuch ? <StatusNotice tone="danger" title={t('send.insufficient')} {...(sendable !== null ? { body: `${t('send.maxSendable')} ${formatDecimal(sendable, 'ETH', 'floor')} ETH` } : {})} /> : null}
        </View>
        <View style={{ flexDirection: 'row', gap: th.semantic.layout.fieldGap }}>
          {chips.map((c) => (
            <Chip key={c.pct} label={t(c.label)} selected={chosen?.pct === c.pct} disabled={c.raw === 0n} onPress={() => setAmount(c.value)} />
          ))}
        </View>
        <Keypad labels={{ dot: t('send.keypad.dot'), delete: t('send.keypad.delete') }} onKey={onKey} />
      </View>
    </Screen>
  )
}
