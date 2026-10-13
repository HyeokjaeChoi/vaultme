import { useTranslation } from 'react-i18next'
import { transactions } from '@/entities/transaction/fixtures'
import { useTheme } from '@/shared/theme'
import { ActivityRow, Screen, Text } from '@/shared/ui'
import { View } from 'react-native'

/** S40 내역 */
export function ActivityPage() {
  const { t } = useTranslation()
  const th = useTheme()
  return (
    <Screen edges={['top']} gap="row">
      <View style={{ paddingTop: th.primitive.space[2] }}>
        <Text variant="h1" accessibilityRole="header">{t('activity.title')}</Text>
      </View>
      {transactions.map((x) => (
        <ActivityRow
          key={x.id}
          title={t(`activity.${x.kind}`)}
          detail={x.detail}
          time={t(`activity.${x.when}`)}
          amount={x.amount}
          kind={x.kind}
          status={x.status}
          statusLabel={t(`activity.${x.status}`)}
        />
      ))}
    </Screen>
  )
}
