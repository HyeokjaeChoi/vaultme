import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { assets } from '@/entities/asset/fixtures'
import type { ReviewValues } from '@/entities/transaction/review'
import { diffGroups } from '@/shared/lib/address'
import { useTheme } from '@/shared/theme'
import { StatusNotice, SummaryRow, Text } from '@/shared/ui'

type Props = { values: ReviewValues; checkedAt: string; rechecking: boolean; onRecheck: () => void }

/**
 * R-S22 Review body (Figma 419:12973; risk variants 423:14763 look-alike, 423:14844 burn, 423:14925 token contract).
 * Order by risk: [status line for a risky recipient], amount, recipient (full, mono groups), then a danger notice for a risky recipient,
 * asset / network / account, a section gap, fee / max fee / total (with the "최대 …" sub value), the check notice with "다시 확인", the fee caption.
 * `values.previous` set = look-alike: the differing 4-char groups are marked. Risk comes from wallet-core `recipientRisk` (look-alike, burn, token contract).
 */
export function ReviewPanel({ values, checkedAt, rechecking, onRecheck }: Props) {
  const { t } = useTranslation()
  const th = useTheme()
  const { recipient, previous, risk } = values
  const diff = previous !== null ? diffGroups(recipient, previous) : []
  const risky = risk === 'lookalike' || risk === 'burn' || risk === 'tokenContract'
  return (
    <>
      <View style={{ gap: th.semantic.layout.groupGap }}>
        <Text variant="title1" accessibilityRole="header">{t('review.title')}</Text>
        <View style={{ gap: th.semantic.layout.fieldGap }}>
          {risky ? <Text variant="label" color={th.semantic.status.danger.fg}>{t(`review.status.${risk}`)}</Text> : null}
          <Text variant="displayM" tabular>{values.amount}</Text>
        </View>
      </View>
      <View>
        <SummaryRow format="address" label={t('review.recipient')} value={recipient} highlight={diff} />
        {risky ? <StatusNotice tone="danger" title={t(`review.${risk}.title`)} body={t(`review.${risk}.body`)} /> : null}
        <SummaryRow label={t('review.asset')} value={assets[0].name} />
        <SummaryRow label={t('review.network')} value={account.network} />
        <SummaryRow label={t('review.account')} value={account.name} />
      </View>
      <View>
        <SummaryRow label={t('review.fee')} value={values.fee} />
        <SummaryRow label={t('review.feeCap')} value={values.feeCap} />
        <SummaryRow format="total" label={t('review.total')} value={values.total} sub={t('review.totalMax', { amount: values.totalMax })} />
      </View>
      <StatusNotice
        tone="info"
        title={t('review.checkedFormat')}
        body={t('review.checkedTime', { time: checkedAt })}
        {...(rechecking ? {} : { link: { label: t('review.recheck'), onPress: onRecheck } })}
      />
      {rechecking ? <Text variant="caption" accessibilityLiveRegion="polite" color={th.semantic.text.tertiary}>{t('review.rechecking')}</Text> : null}
      <Text variant="caption" color={th.semantic.text.tertiary}>{t('review.feeNote')}</Text>
    </>
  )
}
