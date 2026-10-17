// Figma: B-S11 Asset detail Sepolia ETH 423:16447 (dark 430:15384), USD Coin 515:30153 (dark 515:30727): Nav (back, title, chips), Amount hero (logo 48), B/Action row, Section band, Block 자산 정보, Section band, Block 이 자산의 내역
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { USDC_SEPOLIA } from '@vaultme/contracts'
import { networkFact } from '@/entities/account/fixtures'
import { assets } from '@/entities/asset/fixtures'
import { useHistory } from '@/features/history'
import { useLiveBalances } from '@/features/balances'
import { useRestored } from '@/features/restore'
import { setPreselectedAsset, useTrackedTx } from '@/features/send'
import { chain } from '@/shared/chain'
import { goBack } from '@/shared/lib/nav'
import { useCopy } from '@/shared/lib/useCopy'
import { useTheme } from '@/shared/theme'
import { ActionRow, AmountHero, Block, BottomSheet, Button, Screen, ScreenHeader, SectionBand, StatusNotice, SummaryRow, Text } from '@/shared/ui'
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
  const { tx, blocked } = useTrackedTx()
  const { view } = useHistory()
  const { copied, copy } = useCopy(t('asset.copied'))
  const [blockSheet, setSheet] = useState(false)
  if (!asset) return null
  const balance = chain.broadcasts ? (live?.[asset.symbol] ?? '—') : restored ? asset.balance : '0'
  const items = (chain.broadcasts ? (view?.items ?? []) : fakeHistoryItems(tx)).filter((i) => i.asset === asset.symbol)
  const usdc = asset.symbol === 'USDC'
  return (
    <Screen gap="none" edges={['top']} bleed topGap="none" header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack('/home')} title={asset.name} chips={<NetworkChips />} />}>
      <AmountHero asset={asset.symbol} amount={balance} unit={asset.symbol} />
      <View style={{ paddingHorizontal: th.semantic.layout.screen.padding }}>
        <ActionRow
          send={{ label: t('home.send'), icon: 'send', onPress: () => (blocked ? setSheet(true) : (setPreselectedAsset(asset.symbol), router.push('/send'))) }}
          receive={{ label: t('home.receive'), icon: 'receive', onPress: () => router.push('/receive') }}
        />
      </View>
      <SectionBand />
      <Block title={t('asset.info')}>
        <SummaryRow label={t('asset.network')} fact value={networkFact} />
        {usdc ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.semantic.layout.groupGap }}>
            <View style={{ flex: 1 }}>
              <SummaryRow label={t('asset.contract')} value={USDC_SEPOLIA} format="address" plain />
            </View>
            <Button size="sm" variant="secondary" icon="copy" label={copied ? t('asset.copied') : t('asset.copy')} {...(copied ? { copied } : {})} onPress={() => void copy(USDC_SEPOLIA)} />
          </View>
        ) : (
          <SummaryRow label={t('asset.contractNative')} fact value={t('asset.noContract')} />
        )}
        <SummaryRow label={t('asset.decimals')} fact value={String(asset.decimals)} />
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
      <BottomSheet
        visible={blockSheet}
        onClose={() => setSheet(false)}
        title={t('send.pendingBlock.title')}
        actions={
          <>
            <Button label={t('common.close')} variant="secondary" onPress={() => setSheet(false)} />
            <Button
              label={t('send.pendingBlock.view')}
              onPress={() => {
                setSheet(false)
                router.push(tx ? { pathname: '/activity/[hash]', params: { hash: tx.hash } } : '/activity')
              }}
            />
          </>
        }
      >
        <Text color={th.semantic.text.secondary}>{t('send.pendingBlock.body')}</Text>
      </BottomSheet>
    </Screen>
  )
}
