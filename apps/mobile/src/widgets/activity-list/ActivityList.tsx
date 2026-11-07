// Figma: B-S40 Activity 404:387 (B/Date header 403:165, B/Row 보내는 중 / 받음 / 보냄 / 실패)
import { useRouter } from 'expo-router'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import Animated from 'react-native-reanimated'
import { assets } from '@/entities/asset'
import { transactions } from '@/entities/transaction'
import { detailRoute, type HistoryItem } from '@/features/history'
import { rowTitleKey, txView, usePendingTx } from '@/features/send'
import { showAmount } from '@/shared/lib/amount'
import { clock, dateLabel, dayGroup, dayKey } from '@/shared/lib/time'
import { useStaggerReveal } from '@/shared/theme'
import { ActivityRow, DateHeader } from '@/shared/ui'

const assetName = (symbol: string) => assets.find((a) => a.symbol === symbol)?.name ?? symbol

/** Fixture rows as history items (fake adapter). The real pending send replaces the example pending row. */
export function fakeHistoryItems(tx: ReturnType<typeof usePendingTx>['tx']): HistoryItem[] {
  const own: HistoryItem[] = tx
    ? [
        {
          id: tx.hash,
          hash: tx.hash,
          kind: 'send',
          asset: tx.asset,
          amount: tx.amount,
          counterparty: tx.to,
          at: tx.createdAt,
          ...txView(tx.state),
          local: true,
        },
      ]
    : []
  const rest = transactions
    .filter((x) => !(tx && x.id === '1'))
    .map((x): HistoryItem => ({
      id: x.id,
      hash: x.id,
      kind: x.kind,
      asset: x.asset,
      amount: x.amount,
      counterparty: '',
      at: x.at,
      ...txView(x.state),
      local: false,
    }))
  const all = [...own, ...rest]
  all.sort((a, b) => b.at - a.at)
  return all
}

/** `dated`: Home's list has no date headers, so a finished row says its day ("10월 12일"); a row in progress and any row of today say the time. */
/** `enter` (from `useStaggerReveal`) and the row's `index` in the list: the first-reveal stagger. Without `enter`, and for a caution (warning) row, the row shows at once. */
type Reveal = { enter: ReturnType<typeof useStaggerReveal>; index: number }

function Row({ item, dated, reveal }: { item: HistoryItem; dated?: boolean; reveal?: Reveal | undefined }) {
  const { t } = useTranslation()
  const router = useRouter()
  const unknown = item.label === 'activity.unknown'
  const title = t(rowTitleKey(item.kind, item.label))
  const day = dated && item.status !== 'pending' ? dayGroup(item.at, Date.now()) : 'today' // eslint-disable-line react-hooks/purity -- each render reads the clock so day groups roll over
  const when = day === 'today' ? clock(item.at) : day
  const amount = `${item.kind === 'send' ? '−' : '+'}${showAmount(item.amount, item.asset, 'floor')}`
  const row = (
    <ActivityRow
      title={title}
      detail={`${assetName(item.asset)} · ${when}${unknown ? ` · ${t('activity.row.unknownSub')}` : ''}`}
      time={clock(item.at)}
      amount={amount}
      kind={item.kind}
      asset={item.asset}
      status={item.status}
      statusLabel={t(item.label)}
      {...(item.caution ? { caution: t('activity.row.caution') } : {})}
      onPress={() => router.push(detailRoute(item))}
    />
  )
  return reveal && !item.caution ? <Animated.View {...reveal.enter(reveal.index)}>{row}</Animated.View> : row
}

export function ActivityList({ items, enter }: { items: HistoryItem[]; enter?: ReturnType<typeof useStaggerReveal> }) {
  const groups: { key: string; day: string; items: HistoryItem[]; first: number }[] = []
  for (const [i, item] of items.entries()) {
    const key = dayKey(item.at)
    const g = groups.find((x) => x.key === key)
    if (g) g.items.push(item)
    else groups.push({ key, day: dateLabel(item.at), items: [item], first: i })
  }
  return (
    <>
      {groups.map((g) => (
        <View key={g.key}>
          <DateHeader date={g.day} />
          {g.items.map((item, n) => (
            <Row key={item.id} item={item} reveal={enter ? { enter, index: g.first + n } : undefined} />
          ))}
        </View>
      ))}
    </>
  )
}

/** Home / asset detail: the newest rows (default 3), no date headers (Figma S10 515:42137, S11 515:43319). */
export function RecentRows({
  items,
  limit = 3,
  enter,
}: {
  items: HistoryItem[]
  limit?: number
  enter?: ReturnType<typeof useStaggerReveal>
}) {
  return (
    <>
      {items.slice(0, limit).map((item, i) => (
        <Row key={item.id} item={item} dated reveal={enter ? { enter, index: i } : undefined} />
      ))}
    </>
  )
}
