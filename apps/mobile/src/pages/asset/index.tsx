// Figma: B-S11 Asset detail Sepolia ETH 423:16447 (dark 430:15384), USD Coin 515:30153 (dark 515:30727): Nav (back, title, chips), Amount hero (logo 48), B/Action row, Section band, Block 자산 정보, Section band, Block 이 자산의 내역
import * as Clipboard from 'expo-clipboard'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { AccessibilityInfo, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { USDC_SEPOLIA } from '@vaultme/contracts'
import { account } from '@/entities/account/fixtures'
import { assets } from '@/entities/asset/fixtures'
import { useHistory } from '@/features/history'
import { useLiveBalances } from '@/features/balances'
import { useRestored } from '@/features/restore'
import { usePendingTx } from '@/features/send'
import { chain } from '@/shared/chain'
import { haptic } from '@/shared/lib/haptics'
import { goBack } from '@/shared/lib/nav'
import { useTheme } from '@/shared/theme'
import { ActionRow, AmountHero, Block, Button, Screen, ScreenHeader, SectionBand, StatusNotice, SummaryRow } from '@/shared/ui'
import { RecentRows, fakeHistoryItems } from '@/widgets/activity-list/ActivityList'
import { NetworkChips } from '@/widgets/network-chips/NetworkChips'

/** S11 asset detail: the asset's holding, Send / Receive, what is unique to the asset (network, USDC contract address with copy, fee note) and only this asset's activity. Opened from an asset row on Home. */
export function AssetDetailPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const { symbol, variant } = useLocalSearchParams<{ symbol: string; variant?: string }>()
  const asset = assets.find((a) => a.symbol === symbol)
  const live = useLiveBalances()
  const restored = useRestored() || (__DEV__ && variant === 'restored') // `?variant=restored` is a __DEV__ capture override
  const { tx, blocked } = usePendingTx()
  const { view } = useHistory()
  if (!asset) return null
  const balance = chain.broadcasts ? (live?.[asset.symbol] ?? '—') : restored ? asset.balance : '0'
  const items = (chain.broadcasts ? (view?.items ?? []) : fakeHistoryItems(tx)).filter((i) => i.asset === asset.symbol)
  const usdc = asset.symbol === 'USDC'
  const copy = async () => {
    try {
      await Clipboard.setStringAsync(USDC_SEPOLIA)
      haptic.copy()
      AccessibilityInfo.announceForAccessibility(t('asset.copied'))
    } catch {
      // clipboard unavailable: nothing to confirm
    }
  }
  return (
    <Screen gap="none" edges={['top']} bleed topGap="none" header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack('/home')} title={asset.name} chips={<NetworkChips />} />}>
      <AmountHero asset={asset.symbol} amount={balance} unit={asset.symbol} />
      <View style={{ paddingHorizontal: th.semantic.layout.screen.padding }}>
        <ActionRow
          send={{ label: t('home.send'), icon: 'send', onPress: () => (blocked ? router.push('/home') : router.push('/send')) }}
          receive={{ label: t('home.receive'), icon: 'receive', onPress: () => router.push('/receive') }}
        />
      </View>
      <SectionBand />
      <Block title={t('asset.info')}>
        <SummaryRow label={t('asset.network')} value={account.network} />
        {usdc ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.semantic.layout.groupGap }}>
            <View style={{ flex: 1 }}>
              <SummaryRow label={t('asset.contract')} value={USDC_SEPOLIA} format="address" plain />
            </View>
            <Button size="sm" variant="secondary" icon="copy" label={t('asset.copy')} onPress={() => void copy()} />
          </View>
        ) : null}
        <StatusNotice tone="info" title={t(usdc ? 'asset.feeUsdc' : 'asset.feeEth')} />
      </Block>
      {items.length > 0 ? (
        <>
          <SectionBand />
          <Block title={t('asset.history')} link={t('home.viewAll')} onLink={() => router.push({ pathname: '/activity', params: { asset: asset.symbol } })}>
            <RecentRows items={items} />
          </Block>
        </>
      ) : null}
    </Screen>
  )
}
