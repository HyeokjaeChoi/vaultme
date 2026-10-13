import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { review } from '@/entities/transaction/fixtures'
import { diffGroups } from '@/shared/lib/address'
import { StatusNotice, TransactionPanel } from '@/shared/ui'

/** C15 Transaction panel (static). `risk` = High risk state: danger status line and notice, only the differing 4-char chunks marked. */
export function ReviewPanel({ risk }: { risk: boolean }) {
  const { t } = useTranslation()
  return (
    <TransactionPanel
      accountLabel={t('review.account')}
      account={account.name}
      networkLabel={t('review.network')}
      network={account.network}
      heading={t('review.heading')}
      status={risk ? t('review.lookalike.status') : t('review.ready')}
      risk={risk}
      amount={review.amount}
      recipientLabel={t('review.recipient')}
      recipient={risk ? review.lookalike : review.recipient}
      highlight={risk ? diffGroups(review.lookalike, review.recipient) : []}
      feeLabel={t('review.fee')}
      fee={review.fee}
      totalLabel={t('review.total')}
      total={review.total}
      note={t('review.feeNote')}
      notice={
        risk ? (
          <StatusNotice tone="danger" title={t('review.lookalike.title')} body={t('review.lookalike.body')} />
        ) : (
          <StatusNotice tone="clear" title={t('review.checkedTitle')} body={t('review.checkedBody', { time: review.checkedAt })} />
        )
      }
      detailsLabel={t('review.rawData')}
    />
  )
}
