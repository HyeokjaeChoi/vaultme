// Figma: B-S40 Activity 404:387, empty 423:16109, loading 423:16158, error cached 423:16236, error no cache, test mode, unknown + replaced rows
import { useLocalSearchParams, useRouter } from 'expo-router'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { transactions } from '@/entities/transaction/fixtures'
import { useHistory, type HistoryItem, type HistoryView } from '@/features/history'
import { txView, usePendingTx } from '@/features/send'
import { chain } from '@/shared/chain'
import { formatUpdated } from '@/shared/lib/time'
import { useTheme } from '@/shared/theme'
import { EmptyState, Screen, SkeletonRow, StatusNotice, Text } from '@/shared/ui'
import { ActivityList as List, fakeHistoryItems } from '@/widgets/activity-list/ActivityList'
import { NetworkChips } from '@/widgets/network-chips/NetworkChips'

function Loading() {
  const { t } = useTranslation()
  const th = useTheme()
  return (
    <View accessibilityLiveRegion="polite">
      <Text variant="bodySmall" color={th.semantic.text.secondary} style={{ paddingVertical: th.primitive.space[2] }}>{t('activity.loading')}</Text>
      {Array.from({ length: 6 }, (_, i) => <SkeletonRow key={i} />)}
    </View>
  )
}

function Content({ view, reload }: { view: HistoryView | null; reload: () => void }) {
  const { t } = useTranslation()
  const router = useRouter()
  if (!view) return <Loading />
  const now = Date.now()
  if (view.failed && view.items.length === 0) {
    // Nothing cached and the fetch failed: the whole body is the error state (Figma error no cache, cloud-cross hero).
    return <EmptyState icon="cloudCross" tone="warning" title={t('activity.errorNoCache.title')} body={t('activity.errorNoCache.body')} action={{ label: t('common.retry'), onPress: reload }} />
  }
  return (
    <>
      {view.failed ? (
        <StatusNotice tier="banner" tone="warning" title={t('activity.error.title')} body={view.updatedAt === null ? t('activity.errorNoCache.body') : t('activity.error.body', { time: formatUpdated(view.updatedAt, now) })} link={{ label: t('common.retry'), onPress: reload }} />
      ) : null}
      {view.items.length === 0 && !view.failed ? (
        <EmptyState title={t('activity.empty.title')} body={t('activity.empty.body')} action={{ label: t('activity.empty.cta'), onPress: () => router.push('/receive') }} />
      ) : null}
      <List items={view.items} />
    </>
  )
}

/** Fake adapter: example rows plus the pending send from the kv (opens S41). */
function FakeHistory() {
  const { tx } = usePendingTx()
  return (
    <List items={fakeHistoryItems(tx)} />
  )
}

/** `?state=loading|empty|error|rows` (`error` + `cache=0` = no cache, `rows` = Figma 460:5024 unknown/replaced rows) is a __DEV__ capture override of the S40 states. */
function DevState({ state, cache }: { state: string; cache?: string }) {
  const { t } = useTranslation()
  const router = useRouter()
  if (state === 'loading') return <Loading />
  if (state === 'empty') return <EmptyState title={t('activity.empty.title')} body={t('activity.empty.body')} action={{ label: t('activity.empty.cta'), onPress: () => router.push('/receive') }} />
  if (state === 'rows') {
    const extra: HistoryItem[] = (['Unknown', 'Replaced'] as const).map((st, i) => ({ hash: `x${i}`, kind: 'send', asset: 'ETH', amount: i ? '0.01' : '0.05', at: new Date(2026, 9, 11, 7, 30 - i * 20).getTime(), counterparty: '', ...txView(st), local: false }))
    return <List items={[...fakeHistoryItems(null), ...extra].sort((a, b) => b.at - a.at)} />
  }
  if (state === 'error' && cache === '0') return <Content view={{ items: [], updatedAt: null, failed: true }} reload={() => undefined} />
  const cached = transactions.filter((x) => x.id === '2' || x.id === '3')
  const items = cached.map((x): HistoryItem => ({ hash: x.id, kind: x.kind, asset: x.asset, amount: x.amount, counterparty: '', at: x.at, ...txView(x.state), local: false }))
  return <Content view={{ items, updatedAt: new Date(2026, 9, 13, 9, 12).getTime(), failed: true }} reload={() => undefined} />
}

function RealHistory() {
  const { view, reload } = useHistory()
  return <Content view={view} reload={reload} />
}

/** B-S40 내역: title, then date groups of flat rows. */
export function ActivityPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const { state, cache } = useLocalSearchParams<{ state?: string; cache?: string }>()
  return (
    <Screen edges={['top']} gap="none">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: th.primitive.space[2], paddingTop: th.primitive.space[4], paddingBottom: th.primitive.space[2] }}>
        <Text variant="title1" accessibilityRole="header">{t('activity.title')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.primitive.space['1_5'] }}>
          <NetworkChips />
        </View>
      </View>
      {__DEV__ && state ? <DevState state={state} {...(cache ? { cache } : {})} /> : chain.broadcasts ? <RealHistory /> : <FakeHistory />}
    </Screen>
  )
}
