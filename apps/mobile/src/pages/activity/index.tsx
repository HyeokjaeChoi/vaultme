import { useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { transactions } from '@/entities/transaction/fixtures'
import { usePendingTx } from '@/features/send'
import { shortAddress } from '@/shared/lib/address'
import { useTheme } from '@/shared/theme'
import { TestDataNotice } from '@/widgets/test-data-notice/TestDataNotice'
import { ActivityRow, Group, Screen, Text } from '@/shared/ui'

const DAYS = ['today', 'oct12', 'oct11'] as const

/** R-S40 내역: one white group per date, flat rows inside. The pending send from the kv is the top row of 오늘 and opens S41. */
export function ActivityPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const { tx } = usePendingTx()
  return (
    <Screen edges={['top']}>
      <Text variant="title" accessibilityRole="header">{t('activity.title')}</Text>
      <TestDataNotice />
      {DAYS.map((day) => (
        <View key={day} style={{ gap: th.semantic.layout.fieldGap }}>
          <Text variant="label" color={th.semantic.text.secondary} accessibilityRole="header">{t(`activity.${day}`)}</Text>
          <Group>
            {day === 'today' && tx ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t('activity.send')}, ${shortAddress(tx.to)}, −${tx.amount} ${tx.asset}, ${t(tx.state === 'Unknown' ? 'activity.unknown' : 'activity.pending')}`}
                onPress={() => router.push({ pathname: '/activity/[hash]', params: { hash: tx.hash } })}>
                <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                <ActivityRow
                  title={t('activity.send')}
                  detail={shortAddress(tx.to)}
                  time={new Date(tx.createdAt).toTimeString().slice(0, 5)}
                  amount={`−${tx.amount} ${tx.asset}`}
                  kind="send"
                  status={tx.state === 'Unknown' ? 'unknown' : 'pending'}
                  statusLabel={t(tx.state === 'Unknown' ? 'activity.unknown' : 'activity.pending')}
                />
                </View>
              </Pressable>
            ) : null}
            {transactions
              .filter((x) => x.when === day && !(tx && x.id === '1')) // the real pending send replaces the example pending row
              .map((x) => (
                <ActivityRow
                  key={x.id}
                  title={t(`activity.${x.kind}`)}
                  detail={x.detail}
                  time={x.time}
                  amount={x.amount}
                  kind={x.kind}
                  status={x.status}
                  statusLabel={t(`activity.${x.status}`)}
                />
              ))}
          </Group>
        </View>
      ))}
    </Screen>
  )
}
