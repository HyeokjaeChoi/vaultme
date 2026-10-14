import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import type { ReviewValues } from '@/entities/transaction/review'
import { diffGroups, displayGroups } from '@/shared/lib/address'
import { useTheme } from '@/shared/theme'
import { Group, StatusNotice, SummaryRow, Text } from '@/shared/ui'

type Props = { values: ReviewValues; checkedAt: string; onRecalc: () => void; onEditRecipient: () => void; onEditAmount: () => void }

/**
 * R-S22 Review body: question, amount, the answers as flat Summary rows in one white group, fee and total, then one check notice.
 * `values.previous` set = look-alike recipient (R-S22L): the differing 4-char chunks are marked and the notice is a warning.
 * Values come from the entered recipient, amount and the wallet-core prepare() result. The "다시 계산" link on the check-time row asks the page to fetch a fresh snapshot.
 */
export function ReviewPanel({ values, checkedAt, onRecalc, onEditRecipient, onEditAmount }: Props) {
  const { t } = useTranslation()
  const th = useTheme()
  const { recipient, previous } = values
  const risk = previous !== null
  const diff = risk ? diffGroups(recipient, previous) : []
  const chunks = diff.map((i) => displayGroups(recipient)[i]).join(' ')
  return (
    <>
      <View style={{ gap: th.semantic.layout.sectionGap.product }}>
        <Text variant="title" accessibilityRole="header">{t('review.title')}</Text>
        <View style={{ gap: th.semantic.layout.fieldGap }}>
          <Text variant="amountHero">{values.amount}</Text>
          <Text variant="body" color={th.semantic.text.secondary}>{t('review.scope', { network: account.network, account: account.name })}</Text>
        </View>
      </View>
      <Group>
        <SummaryRow format="address" label={t('review.recipient')} value={recipient} highlight={diff} editLabel={t('common.edit')} onEdit={onEditRecipient} />
        <SummaryRow label={t('review.amount')} value={values.amount} editLabel={t('common.edit')} onEdit={onEditAmount} />
        <SummaryRow label={t('review.network')} value={account.network} />
      </Group>
      <Group surface={false}>
        <SummaryRow label={t('review.fee')} value={values.fee} />
        <SummaryRow label={t('review.feeCap')} value={values.feeCap} />
        <SummaryRow format="total" label={t('review.total')} value={values.total} />
        <SummaryRow label={t('review.checkedAt')} value={checkedAt} editLabel={t('review.recalc')} editAccessibilityLabel={t('review.recalcLabel')} onEdit={onRecalc} />
      </Group>
      {values.risk === 'burn' || values.risk === 'tokenContract' ? (
        <StatusNotice tone="warning" title={t(`review.${values.risk}.title`)} body={t(`review.${values.risk}.body`)} />
      ) : risk ? (
        <StatusNotice tone="warning" title={t('review.lookalike.title', { count: diff.length })} body={t('review.lookalike.body', { chunks })} />
      ) : (
        <StatusNotice tone="info" title={t('review.checkedTitle')} body={t('review.checkedBody', { time: checkedAt })} />
      )}
    </>
  )
}
