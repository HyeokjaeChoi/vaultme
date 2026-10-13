import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { review } from '@/entities/transaction/fixtures'
import { diffGroups, groupAddress } from '@/shared/lib/address'
import { useTheme } from '@/shared/theme'
import { Group, StatusNotice, SummaryRow, Text } from '@/shared/ui'

type Props = { risk: boolean; onEditRecipient: () => void; onEditAmount: () => void }

/**
 * R-S22 Review body: question, amount, the answers as flat Summary rows in one white group, fee and total, then one check notice.
 * `risk` = look-alike recipient (R-S22L): the differing 4-char chunks are marked and the notice is a warning. Fixture data, no wallet-core.
 */
export function ReviewPanel({ risk, onEditRecipient, onEditAmount }: Props) {
  const { t } = useTranslation()
  const th = useTheme()
  const recipient = risk ? review.lookalike : review.recipient
  const diff = risk ? diffGroups(review.lookalike, review.recipient) : []
  const chunks = diff.map((i) => groupAddress(review.lookalike)[i]).join(' ')
  return (
    <>
      <View style={{ gap: th.semantic.layout.sectionGap.product }}>
        <Text variant="title" accessibilityRole="header">{t('review.title')}</Text>
        <View style={{ gap: th.semantic.layout.fieldGap }}>
          <Text variant="amountHero">{review.amount}</Text>
          <Text variant="body" color={th.semantic.text.secondary}>{t('review.scope', { network: account.network, account: account.name })}</Text>
        </View>
      </View>
      <Group>
        <SummaryRow format="address" label={t('review.recipient')} value={recipient} highlight={diff} editLabel={t('common.edit')} onEdit={onEditRecipient} />
        <SummaryRow label={t('review.amount')} value={review.amount} editLabel={t('common.edit')} onEdit={onEditAmount} />
        <SummaryRow label={t('review.network')} value={account.network} />
      </Group>
      <Group surface={false}>
        <SummaryRow label={t('review.fee')} value={review.fee} />
        <SummaryRow format="total" label={t('review.total')} value={review.total} />
      </Group>
      {risk ? (
        <StatusNotice tone="warning" title={t('review.lookalike.title', { count: diff.length })} body={t('review.lookalike.body', { chunks })} />
      ) : (
        <StatusNotice tone="info" title={t('review.checkedTitle')} body={t('review.checkedBody', { time: review.checkedAt })} />
      )}
    </>
  )
}
