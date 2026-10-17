// Figma: B-S40 Activity 404:387 (B/Date header 403:165, B/Row 보내는 중 / 받음 / 보냄 / 실패)
import { useRouter } from 'expo-router'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { assets } from '@/entities/asset/fixtures'
import { transactions } from '@/entities/transaction/fixtures'
import type { HistoryItem } from '@/features/history'
import { rowTitleKey, txView, usePendingTx } from '@/features/send'
import { showAmount } from '@/shared/lib/amount'
import { clock, dateLabel } from '@/shared/lib/time'
import { ActivityRow, DateHeader } from '@/shared/ui'

const assetName = (symbol: string) => assets.find((a) => a.symbol === symbol)?.name ?? symbol

/** Fixture rows as history items (fake adapter). The real pending send replaces the example pending row. */
export function fakeHistoryItems(tx: ReturnType<typeof usePendingTx>["tx"]): HistoryItem[] {
  const own: HistoryItem[] = tx ? [{ hash: tx.hash, kind: 'send', asset: tx.asset, amount: tx.amount, counterparty: tx.to, at: tx.createdAt, ...txView(tx.state), local: true }] : []
  const rest = transactions
    .filter((x) => !(tx && x.id === '1'))
    .map((x): HistoryItem => ({ hash: x.id, kind: x.kind, asset: x.asset, amount: x.amount, counterparty: '', at: x.at, ...txView(x.state), local: false }))
  return [...own, ...rest].sort((a, b) => b.at - a.at)
}

function Row({ item }: { item: HistoryItem }) {
  const { t } = useTranslation()
  const router = useRouter()
  const unknown = item.label === 'activity.unknown'
  const title = t(rowTitleKey(item.kind, item.label))
  const amount = `${item.kind === 'send' ? '−' : '+'}${showAmount(item.amount, item.asset, 'floor')}`
  return (
    <ActivityRow
      title={title}
      detail={unknown ? t('activity.row.unknownSub') : `${assetName(item.asset)} · ${clock(item.at)}`}
      time={clock(item.at)}
      amount={amount}
      kind={item.kind}
      asset={item.asset}
      status={item.status}
      statusLabel={t(item.label)}
      {...(item.local ? { onPress: () => router.push({ pathname: '/activity/[hash]', params: { hash: item.hash } }) } : {})}
    />
  )
}

export function ActivityList({ items }: { items: HistoryItem[] }) {
  const groups: { day: string; items: HistoryItem[] }[] = []
  for (const item of items) {
    const day = dateLabel(item.at)
    const g = groups.find((x) => x.day === day)
    if (g) g.items.push(item)
    else groups.push({ day, items: [item] })
  }
  return (
    <>
      {groups.map((g) => (
        <View key={g.day}>
          <DateHeader date={g.day} />
          {g.items.map((item) => <Row key={item.hash} item={item} />)}
        </View>
      ))}
    </>
  )
}

