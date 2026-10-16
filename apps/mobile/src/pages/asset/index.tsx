// Figma: B-S11 Asset detail Sepolia ETH 423:16447 (Nav with title, B/Balance hero, B/Action row, B/Section header "내역", date groups of B/Row)
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { assets } from '@/entities/asset/fixtures'
import { useHistory } from '@/features/history'
import { useLiveBalances } from '@/features/balances'
import { useRestored } from '@/features/restore'
import { usePendingTx } from '@/features/send'
import { chain } from '@/shared/chain'
import { goBack } from '@/shared/lib/nav'
import { ActionRow, PortfolioBalance, Screen, ScreenHeader, SectionHeader } from '@/shared/ui'
import { ActivityList, fakeHistoryItems } from '@/widgets/activity-list/ActivityList'

/** S11 asset detail: the asset's holding, Send / Receive, and its own history. Opened from an asset row on Home. */
export function AssetDetailPage() {
  const { t } = useTranslation()
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
  return (
    <Screen gap="none" edges={['top']} header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack('/home')} title={asset.name} />}>
      <PortfolioBalance label={t('home.testnetLabel')} value={`${balance} ${asset.symbol}`} note={t('home.priceNote')} />
      <ActionRow
        primary={{ label: t('home.send'), icon: 'send', onPress: () => (blocked ? router.push('/home') : router.push('/send')) }}
        secondary={{ label: t('home.receive'), icon: 'receive', onPress: () => router.push('/receive') }}
      />
      {items.length > 0 ? (
        <>
          <SectionHeader title={t('activity.title')} />
          <ActivityList items={items} />
        </>
      ) : null}
    </Screen>
  )
}
