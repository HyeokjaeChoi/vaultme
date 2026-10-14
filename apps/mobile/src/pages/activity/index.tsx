import { useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { transactions } from '@/entities/transaction/fixtures'
import { useHistory, type HistoryItem } from '@/features/history'
import { txView, usePendingTx } from '@/features/send'
import { chain } from '@/shared/chain'
import { shortAddress } from '@/shared/lib/address'
import { showAmount } from '@/shared/lib/amount'
import { clock, dayGroup, formatUpdated } from '@/shared/lib/time'
import { useTheme } from '@/shared/theme'
import { TestDataNotice } from '@/widgets/test-data-notice/TestDataNotice'
import { ActivityRow, Button, CollectionState, Group, Screen, StatusNotice, Text } from '@/shared/ui'

const DAYS = ['today', 'oct12', 'oct11'] as const

/** R-S40 내역, fake adapter: example rows plus the pending send from the kv (top row of 오늘, opens S41). */
function FakeHistory() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const { tx } = usePendingTx()
  return (
    <>
      <TestDataNotice />
      {DAYS.map((day) => (
        <View key={day} style={{ gap: th.semantic.layout.fieldGap }}>
          <Text variant="label" color={th.semantic.text.secondary} accessibilityRole="header">{t(`activity.${day}`)}</Text>
          <Group>
            {day === 'today' && tx ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t('activity.send')}, ${shortAddress(tx.to)}, −${showAmount(tx.amount, tx.asset, 'floor')}, ${t(txView(tx.state).label)}`}
                onPress={() => router.push({ pathname: '/activity/[hash]', params: { hash: tx.hash } })}>
                <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                  <ActivityRow
                    title={t('activity.send')}
                    detail={shortAddress(tx.to)}
                    time={clock(tx.createdAt)}
                    amount={`−${showAmount(tx.amount, tx.asset, 'floor')}`}
                    kind="send"
                    status={txView(tx.state).status}
                    statusLabel={t(txView(tx.state).label)}
                  />
                </View>
              </Pressable>
            ) : null}
            {transactions // example rows only in fake mode
              .filter((x) => x.when === day && !(tx && x.id === '1')) // the real pending send replaces the example pending row
              .map((x) => (
                <ActivityRow key={x.id} title={t(`activity.${x.kind}`)} detail={x.detail} time={x.time} amount={x.amount} kind={x.kind} status={x.status} statusLabel={t(`activity.${x.status}`)} />
              ))}
          </Group>
        </View>
      ))}
    </>
  )
}

function Row({ item }: { item: HistoryItem }) {
  const { t } = useTranslation()
  const router = useRouter()
  const sign = item.kind === 'send' ? '−' : '+'
  const row = (
    <ActivityRow
      title={t(`activity.${item.kind}`)}
      detail={shortAddress(item.counterparty)}
      time={clock(item.at)}
      amount={`${sign}${showAmount(item.amount, item.asset, 'floor')}`}
      kind={item.kind}
      status={item.status}
      statusLabel={t(item.label)}
    />
  )
  if (!item.local) return row
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('activity.send')}, ${shortAddress(item.counterparty)}, ${clock(item.at)}, −${showAmount(item.amount, item.asset, 'floor')}, ${t(item.label)}`}
      onPress={() => router.push({ pathname: '/activity/[hash]', params: { hash: item.hash } })}>
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>{row}</View>
    </Pressable>
  )
}

/** R-S40 내역, real mode (Figma C3-S40 377:2216 loading, 377:2261 empty, 377:2332 error with cache, 377:2388 normal). Q58: the last good list stays with its update time. */
function RealHistory() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const { view, reload } = useHistory()
  if (!view) return <CollectionState state="loading" title={t('activity.loading')} />
  const now = Date.now()
  const groups: { day: string; items: HistoryItem[] }[] = []
  for (const item of view.items) {
    const day = dayGroup(item.at, now)
    const g = groups.find((x) => x.day === day)
    if (g) g.items.push(item)
    else groups.push({ day, items: [item] })
  }
  const retry = <Button label={t('common.retry')} variant="secondary" onPress={reload} />
  return (
    <>
      {view.updatedAt !== null && (groups.length > 0 || view.failed) ? <Text variant="body" color={th.semantic.text.secondary}>{t('activity.updatedAt', { time: formatUpdated(view.updatedAt, now) })}</Text> : null}
      {view.failed ? (
        <>
          <StatusNotice tone="warning" title={t('activity.error.title')} body={t(view.updatedAt === null ? 'activity.errorNoCache.body' : 'activity.error.body')} />
          {retry}
        </>
      ) : null}
      {groups.length === 0 && !view.failed ? (
        <CollectionState state="empty" title={t('activity.empty.title')} body={t('activity.empty.body')} action={<Button label={t('activity.empty.cta')} variant="secondary" onPress={() => router.push('/receive')} />} />
      ) : null}
      {groups.map((g) => (
        <View key={g.day} style={{ gap: th.semantic.layout.fieldGap }}>
          <Text variant="label" color={th.semantic.text.secondary} accessibilityRole="header">{g.day === 'today' ? t('activity.today') : g.day}</Text>
          <Group>
            {g.items.map((item) => <Row key={item.hash} item={item} />)}
          </Group>
        </View>
      ))}
    </>
  )
}

/** R-S40 내역: one white group per date, flat rows inside. */
export function ActivityPage() {
  const { t } = useTranslation()
  return (
    <Screen edges={['top']}>
      <Text variant="title" accessibilityRole="header">{t('activity.title')}</Text>
      {chain.broadcasts ? <RealHistory /> : <FakeHistory />}
    </Screen>
  )
}
