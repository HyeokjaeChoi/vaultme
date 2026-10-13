import { useTranslation } from 'react-i18next'
import { transactions } from '@/entities/transaction/fixtures'
import { ActivityRow, Screen, Text } from '@/shared/ui'

/** S40 내역 */
export function ActivityPage() {
  const { t } = useTranslation()
  return (
    <Screen edges={['top']}>
      <Text variant="title" accessibilityRole="header">{t('activity.title')}</Text>
      {transactions.map((x) => (
        <ActivityRow
          key={x.id}
          title={`${t(`activity.${x.kind}`)} ${x.asset}`}
          time={t(`activity.${x.when}`)}
          kind={x.kind}
          amount={x.amount}
          status={x.status}
          statusLabel={t(`activity.${x.status}`)}
        />
      ))}
    </Screen>
  )
}
