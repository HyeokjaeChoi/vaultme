import { formatDecimal, type AssetId } from '@vaultme/wallet-core'
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import Animated from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import { assets } from '@/entities/asset/fixtures'
import { cleanAmount } from '@/entities/transaction/review'
import { getPreselectedAsset, parseSendAsset, sendFrom, sendLimits, useSendBalances, useSendable } from '@/features/send'
import { useDevEthShort } from '@/shared/chain/useDevEthShort'
import { type KeypadKey, exceedsBalance, isZeroAmount, pressKey } from '@/shared/lib/amount'
import { isAddressFormat } from '@/shared/lib/address'
import { goBack } from '@/shared/lib/nav'
import { useTheme } from '@/shared/theme'
import { useShake } from '@/shared/theme/motion'
import { AmountDisplay, AssetSelector, Button, Chip, Keypad, Screen, ScreenHeader, StatusNotice, Text } from '@/shared/ui'
import { AssetPickerSheet } from '@/widgets/asset-picker/AssetPickerSheet'
import { FaucetRow } from '@/widgets/faucet-row/FaucetRow'
import { NetworkChips } from '@/widgets/network-chips/NetworkChips'

const CHIP_LABEL = { 25: 'send.chip.p25', 50: 'send.chip.p50', 100: 'send.chip.all' } as const

/**
 * B-S20b 얼마를 보낼까요? (Figma ETH 618:102298, asset sheet 618:102396, USDC 618:102511, USDC ETH short 618:102639; older 423:929 / 423:1000 / 423:1071).
 * Title, asset row (ETH by default, or the asset the entry point chose; tap = asset sheet), then amount, chips and the custom keypad at the bottom.
 * Chips = share of the sendable amount, floored to the display digits (wallet-core chipAmount). ETH sendable = balance - max fee; USDC sendable = the USDC balance, and the fee needs ETH:
 * when ETH cannot cover the fee cap the chips are off with the reason and a faucet row (the keypad still works; Review blocks). USDC keypad has "00" (6 decimals).
 * `?asset=USDC` picks the asset by route param; `?ethShort=1` is a __DEV__ capture override of the fake adapter (shared/chain/devOverride).
 */
export function SendAmountPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const { to, amount: initial, asset: assetParam, sheet } = useLocalSearchParams<{ to?: string; amount?: string; asset?: string; sheet?: string }>()
  useDevEthShort()
  const [asset, setAsset] = useState<AssetId>(assetParam ? parseSendAsset(assetParam) : getPreselectedAsset())
  const [amount, setAmount] = useState(initial === undefined ? '0' : (cleanAmount(initial, asset) ?? '0'))
  const [picker, setPicker] = useState(__DEV__ && sheet === '1') // `?sheet=1` opens the asset sheet on arrival (__DEV__ capture override)
  const snap = useSendable(to ?? '', asset)
  const balances = useSendBalances()
  const { style: shakeStyle, shake } = useShake(th.primitive.space[2])
  if (!to || !isAddressFormat(to)) return <Redirect href="/send" />
  const info = assets.find((a) => a.symbol === asset) ?? assets[0]
  const { sendable, feeShort, chips } = sendLimits(asset, snap)
  const tooMuch = sendable !== null && exceedsBalance(amount, sendable, asset)
  const onKey = (k: KeypadKey) => {
    const r = pressKey(amount, k, sendable, asset)
    if (r.overMax) shake() // the key is rejected; the Keypad gives the warning haptic for `false`
    else setAmount(r.amount)
    return r.accepted
  }
  const pick = (a: AssetId) => {
    setPicker(false)
    if (a !== asset) {
      setAsset(a)
      setAmount('0') // an amount of one asset means nothing for the other
    }
  }
  const chosen = chips.find((c) => c.raw > 0n && c.value === amount.replace(/\.$/, ''))
  const maxLine = sendable !== null ? `${t('send.maxSendable')} ${formatDecimal(sendable, asset, 'floor')} ${asset}` : undefined
  const sub = chosen?.pct === 100 && asset === 'ETH' ? t('send.feeExcluded') : maxLine
  return (
    <Screen
      topGap="group"
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack()} chips={<NetworkChips />} />}
      footer={<Button label={t('send.review')} disabled={isZeroAmount(amount) || tooMuch} onPress={() => router.push({ pathname: '/review', params: { to, amount, asset } })} />}
    >
      <View style={{ flex: 1, gap: th.semantic.layout.groupGap }}>
        <View style={{ gap: th.primitive.space[2] }}>
          <Text variant="title1" accessibilityRole="header">{t('send.amountQuestion')}</Text>
          <AssetSelector name={info.name} symbol={asset} label={t('send.assetLabel')} onPress={() => setPicker(true)} />
        </View>
        {/* Composed column (Figma S20B): amount, sub line and chips sit together at the bottom of the free space, just above the keypad. */}
        <View style={{ flex: 1, justifyContent: 'flex-end', gap: th.semantic.layout.groupGap }}>
          <View>
            <Animated.View style={shakeStyle}>
              <AmountDisplay amount={amount} ticker={asset} error={tooMuch} {...(sub && !tooMuch ? { sub } : {})} />
            </Animated.View>
            {tooMuch ? <StatusNotice tone="danger" title={t('send.insufficient')} {...(maxLine ? { body: maxLine } : {})} /> : null}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: th.semantic.layout.fieldGap }}>
            {chips.map((c) => (
              <Chip key={c.pct} label={t(CHIP_LABEL[c.pct])} selected={chosen?.pct === c.pct} disabled={c.raw === 0n} onPress={() => setAmount(c.value)} />
            ))}
          </View>
          {feeShort ? (
            <View>
              <StatusNotice tone="warning" title={t('send.feeShort')} />
              <FaucetRow address={sendFrom()} bare />
            </View>
          ) : null}
        </View>
        <Keypad assetKey={asset === 'USDC' ? 'doubleZero' : 'dot'} labels={{ dot: t('send.keypad.dot'), delete: t('send.keypad.delete') }} onKey={onKey} />
      </View>
      <AssetPickerSheet visible={picker} onClose={() => setPicker(false)} onPick={pick} balances={balances} selected={asset} />
    </Screen>
  )
}
