import { useTranslation } from 'react-i18next'
import { transactions } from '@/entities/transaction/fixtures'
import { useTheme } from '@/shared/theme'
import { ActivityRow, Group, Screen, Text } from '@/shared/ui'
import { View } from 'react-native'

const DAYS = ['today', 'oct12', 'oct11'] as const

/** R-S40 내역: one white group per date, flat rows inside. */
export function ActivityPage() {
  const { t } = useTranslation()
  const th = useTheme()
  return (
    <Screen edges={['top']}>
      <Text variant="title" accessibilityRole="header">{t('activity.title')}</Text>
      {DAYS.map((day) => (
        <View key={day} style={{ gap: th.semantic.layout.fieldGap }}>
          <Text variant="label" color={th.semantic.text.secondary} accessibilityRole="header">{t(`activity.${day}`)}</Text>
          <Group>
            {transactions
              .filter((x) => x.when === day)
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
