import { useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { assets } from '@/entities/asset/fixtures'
import type { ReviewValues } from '@/entities/transaction/review'
import { diffGroups } from '@/shared/lib/address'
import { useTheme } from '@/shared/theme'
import { AmountHero, Block, SectionBand, StatusNotice, SummaryRow, Text } from '@/shared/ui'
import { AddressText } from '@/shared/ui/AddressBlock'

type Props = {
  values: ReviewValues
  checkedAt: string
  rechecking: boolean
  onRecheck: () => void
  /** The risk sheet was confirmed: the risk line replaces the Banner and the safe-looking caption comes back (look-alike only). */
  acknowledged: boolean
  /** Fee and cap could not be read: the hero says so instead of showing a total. */
  feeUnknown: boolean
  /** Blocking Banner (error states), shown above the hero. */
  banner?: { tone: 'danger' | 'warning'; title: string; body: string }
  onEditRecipient: () => void
  onEditAmount: () => void
}

/**
 * B-S22 Review body (Figma 419:12973 full, risk 423:14763 look-alike / 423:14844 burn / 423:14925 token). Full bleed, blocks split by Section bands:
 * [Banner] -> amount hero (asset logo, Figure + unit, sentence + total) -> 받는 사람 (full address, 수정) -> 보내는 것 (asset / network / account, 수정) -> 비용 (fee, max fee, total with "최대 …", caption, check notice with "다시 확인"; 접기/자세히).
 * A risky recipient (look-alike, burn, token contract; wallet-core `recipientRisk`) shows a danger Banner before the address; look-alike marks the differing 4-char groups (`values.previous`).
 */
export function ReviewPanel({ values, checkedAt, rechecking, onRecheck, acknowledged, feeUnknown, banner, onEditRecipient, onEditAmount }: Props) {
  const { t } = useTranslation()
  const th = useTheme()
  const [open, setOpen] = useState(true)
  const { recipient, previous, risk } = values
  const diff = previous !== null ? diffGroups(recipient, previous) : []
  const risky = risk === 'lookalike' || risk === 'burn' || risk === 'tokenContract'
  const [figure, unit] = values.amount.split(' ')
  // The "format only" caption: not under an unconfirmed risk, and after a burn or token confirmation it stays hidden (only look-alike brings it back).
  const caption = !risky || (acknowledged && risk === 'lookalike')
  const pad = th.semantic.layout.screen.padding
  return (
    <>
      {banner ? (
        <View style={{ paddingHorizontal: pad, paddingTop: th.primitive.space[2] }}>
          <StatusNotice tier="banner" tone={banner.tone} title={banner.title} body={banner.body} />
        </View>
      ) : null}
      <AmountHero
        asset="ETH"
        amount={figure ?? values.amount}
        unit={unit ?? 'ETH'}
        lines={[t('review.heroTo', { account: account.name }), feeUnknown ? t('review.heroFeeAgain') : t('review.heroTotal', { total: values.total })]}
      />
      <SectionBand />
      <Block title={t('review.blockRecipient')} link={t('common.edit')} onLink={onEditRecipient}>
        {risky && !acknowledged ? <StatusNotice tier="banner" tone="danger" title={t(`review.${risk}.title`)} body={t(`review.${risk}.body`)} /> : null}
        <AddressText address={recipient} highlight={diff} />
        {risky && acknowledged ? <StatusNotice tone="danger" title={t(`review.acknowledged.${risk}`)} /> : null}
        {caption ? <Text variant="caption" color={th.semantic.text.tertiary}>{t('review.checkedFormat')}</Text> : null}
      </Block>
      <SectionBand />
      <Block title={t('review.blockAsset')} link={t('common.edit')} onLink={onEditAmount}>
        <SummaryRow label={t('review.asset')} value={assets[0].name} />
        <SummaryRow label={t('review.network')} value={account.network} />
        <SummaryRow label={t('review.account')} value={account.name} />
      </Block>
      <SectionBand />
      <Block title={t('review.blockCost')} link={open ? t('review.fold') : t('review.unfold')} onLink={() => setOpen((v) => !v)}>
        {open ? (
          <>
            <SummaryRow label={t('review.fee')} value={values.fee} />
            <SummaryRow label={t('review.feeCap')} value={values.feeCap} />
          </>
        ) : null}
        <SummaryRow format="total" label={t('review.total')} value={values.total} sub={t('review.totalMax', { amount: values.totalMax })} />
        <Text variant="caption" color={th.semantic.text.tertiary}>{t('review.feeNote')}</Text>
        {rechecking ? (
          <View accessibilityLiveRegion="polite">
            <StatusNotice tone="info" icon="loading" title={t('review.rechecking')} />
          </View>
        ) : (
          <StatusNotice tone="info" title={t('review.checkedTime', { time: checkedAt })} link={{ label: t('review.recheck'), onPress: onRecheck }} />
        )}
      </Block>
    </>
  )
}
