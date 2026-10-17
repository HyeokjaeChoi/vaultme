// Figma: B-S22 Send review 419:12973 (+ states R-S22 error/risk frames: autherror, chainerror, needsreview, blocked, pendingblock, prepareerror, rechecking, lookalike / burn / token + sheet + acknowledged)
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { resolveReview } from '@/entities/transaction/review'
import { diffGroups } from '@/shared/lib/address'
import { haptic } from '@/shared/lib/haptics'
import { useTheme } from '@/shared/theme'
import { BottomSheet, Button, Screen, ScreenHeader, StatusNotice, Text } from '@/shared/ui'
import { AddressText } from '@/shared/ui/AddressBlock'
import { ReviewPanel } from '@/widgets/review-panel/ReviewPanel'
import { NetworkChips } from '@/widgets/network-chips/NetworkChips'
import { goBack } from '@/shared/lib/nav'
import { rememberRecipient, runSend, sendFrom, useAuthName, useRecents, useReviewCore, readPendingTx, writePendingTx, type SendOutcome } from '@/features/send'
import { apiErrorKey } from '@/shared/api'
import { chain } from '@/shared/chain'
import { loadPhrase } from '@/shared/storage'

/** B/Address compare (Figma 477:5145, inside the S22L sheet): Info line, then the previous and the current address (differing chunks marked red + underline), left edge on the sheet's 16 line. */
function Compare({ current, previous }: { current: string; previous: string }) {
  const { t } = useTranslation()
  const th = useTheme()
  return (
    <View style={{ gap: th.semantic.layout.groupGap }}>
      <StatusNotice tone="info" heading title={t('review.lookalike.compareTitle')} />
      <View style={{ gap: th.primitive.space[1] }}>
        <Text variant="bodySmall" color={th.semantic.text.tertiary}>{t('review.lookalike.previous')}</Text>
        <AddressTextPlain address={previous} />
      </View>
      <View style={{ gap: th.primitive.space[1] }}>
        <Text variant="bodySmall" color={th.semantic.text.tertiary}>{t('review.lookalike.current')}</Text>
        <AddressTextPlain address={current} highlight={diffGroups(current, previous)} />
      </View>
    </View>
  )
}

const AddressTextPlain = ({ address, highlight }: { address: string; highlight?: number[] }) => <AddressText address={address} emphasis={false} {...(highlight ? { highlight } : {})} />

type Notice = 'authError' | 'chainError' | 'needsReview' | 'blocked' | 'pending' | 'prepareError'
const NOTICE: Record<Notice, { tone: 'danger' | 'warning'; key: 'send.authError' | 'send.chainError' | 'send.needsReview' | 'send.blocked' | 'send.pendingBlock' | 'send.prepareError' }> = {
  authError: { tone: 'warning', key: 'send.authError' }, // Figma C3-S22 Auth error 379:2279 is a warning
  chainError: { tone: 'danger', key: 'send.chainError' },
  needsReview: { tone: 'warning', key: 'send.needsReview' },
  blocked: { tone: 'danger', key: 'send.blocked' },
  pending: { tone: 'warning', key: 'send.pendingBlock' },
  prepareError: { tone: 'danger', key: 'send.prepareError' },
}

/**
 * B-S22 검토. A risky recipient (look-alike `risk=1`, burn, token contract) swaps the blue CTA for a grey "위험 확인하기": it opens the risk sheet (safe "취소" is Primary), and only after
 * "확인했어요, 보내기" the blue "확인하고 보내기" shows (`sheet=1` opens the sheet on arrival, `ack=1` starts acknowledged: __DEV__ capture overrides).
 * Confirm = per-send OS auth + sign + submit through the ChainPort (fake in C2b). Error states show a Banner above the amount; their buttons follow Figma.
 */
export function ReviewPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const { risk, sheet: sheetParam, ack, to, amount, notice: noticeParam, recheck } = useLocalSearchParams<{ risk?: string; sheet?: string; ack?: string; to?: string; amount?: string; notice?: string; recheck?: string }>()
  const recents = useRecents()
  const recentAddresses = recents.map((r) => r.address)
  const base = resolveReview(to, amount, risk === '1', undefined, recentAddresses)
  const core = useReviewCore(base.recipient, base.amount.replace(' ETH', ''), recentAddresses)
  const values = core.review ? resolveReview(to, amount, risk === '1', core.review, recentAddresses) : base
  const [busy, setBusy] = useState(false)
  const [rechecking, setRechecking] = useState(__DEV__ && recheck === '1') // `?recheck=1` is a __DEV__ capture override of Figma 461:5074
  const authName = useAuthName()
  // `?notice=` is a __DEV__ capture override (Figma C3-S22 notice states).
  const [notice, setNotice] = useState<Notice | null>(__DEV__ && noticeParam && noticeParam in NOTICE ? (noticeParam as Notice) : null)
  const [cause, setCause] = useState<unknown>(null)
  const isRisk = values.risk === 'lookalike' || values.risk === 'burn' || values.risk === 'tokenContract'
  const [sheet, setSheet] = useState(isRisk && sheetParam === '1')
  const [acknowledged, setAcknowledged] = useState(__DEV__ && ack === '1')
  const openSheet = () => {
    haptic.warning()
    setSheet(true)
  }
  const send = async () => {
    if (!core.review || busy) return
    setBusy(true)
    setNotice(null)
    setCause(null)
    let out: SendOutcome
    try {
      out = await runSend(core.review, base.amount.replace(' ETH', ''), sendFrom(), {
        chain,
        loadPhrase,
        readPending: readPendingTx,
        savePending: writePendingTx,
        now: Date.now,
        prompt: { title: t('send.authPrompt'), cancel: t('common.cancel') },
      })
    } finally {
      setBusy(false)
    }
    if (out.status === 'Pending' || out.status === 'Unknown') {
      rememberRecipient({ address: base.recipient, at: out.tx.createdAt, asset: 'ETH', amount: base.amount.replace(' ETH', '') })
      router.replace('/send/result') // one transition: no Home flash. The result screen has no swipe-back (root layout), so Review/Amount cannot be reached again.
    } else if (out.status === 'Cancelled') return
    else {
      if (out.status === 'NeedsReview' && !(await core.refresh())) return // the new fee and total replace the old ones; if the re-read failed, its own error shows instead
      if (out.status === 'ChainError') setCause(out.error)
      setNotice(out.status === 'AuthError' ? 'authError' : out.status === 'ChainError' ? 'chainError' : out.status === 'NeedsReview' ? 'needsReview' : out.status === 'Blocked' ? 'blocked' : 'pending')
    }
  }
  // Sheet opened by the route param stays in step with a later param change (same route re-opened with ?sheet=1 keeps this screen mounted).
  useEffect(() => {
    if (isRisk && sheetParam === '1') setSheet(true)
  }, [isRisk, sheetParam])
  const shownNotice: Notice | null = notice ?? (core.error && core.error !== 'chain' ? 'prepareError' : core.error === 'chain' ? 'chainError' : null)
  // A failed network call says why (offline, busy, clock); anything else keeps the generic send.chainError line.
  const noticeKey = shownNotice === 'chainError' ? apiErrorKey(notice === 'chainError' ? cause : core.cause) : shownNotice ? NOTICE[shownNotice].key : null
  const riskKey = values.risk === 'burn' || values.risk === 'tokenContract' ? values.risk : 'lookalike'
  const gate = isRisk && !acknowledged // the risk sheet must be confirmed before the blue button
  const goPending = () => {
    const tx = readPendingTx()
    router.push(tx && tx !== 'corrupt' ? { pathname: '/activity/[hash]', params: { hash: tx.hash } } : '/activity')
  }
  // Footer by state (Figma): Blocked -> 홈으로, pending block -> 진행 중인 거래 보기, prepare error -> 금액 수정 (all Secondary, no caption);
  // chain error -> 다시 시도, needs review -> 다시 검토 (Primary, no caption); auth error -> 다시 시도 with the caption; risk -> grey 위험 확인하기; else Primary with the caption.
  const caption = t(`send.preSend.${authName}`)
  let footer
  if (shownNotice === 'blocked') footer = <Button label={t('result.home')} variant="secondary" onPress={() => { router.dismissAll(); router.replace('/home') }} />
  else if (shownNotice === 'pending') footer = <Button label={t('send.pendingBlock.view')} variant="secondary" onPress={goPending} />
  else if (shownNotice === 'prepareError') footer = <Button label={t('send.editAmount')} variant="secondary" onPress={() => goBack()} />
  else if (shownNotice === 'chainError') footer = <Button label={t('common.retry')} busy={rechecking} busyLabel={t('busy.recheck')} onPress={() => void core.refresh()} />
  else if (shownNotice === 'needsReview') footer = <Button label={t('review.reconfirm')} busy={busy} busyLabel={t('busy.send')} onPress={() => void send()} />
  else if (rechecking) footer = <Button label={t('review.confirm')} disabled />
  else if (gate && !shownNotice) {
    footer = (
      <>
        <Text variant="caption" color={th.semantic.text.secondary} style={{ textAlign: 'center' }}>{t('send.riskCaption')}</Text>
        <Button label={t('send.checkRisk')} variant="secondary" onPress={openSheet} />
      </>
    )
  } else
    footer = (
      <>
        <Text variant="caption" color={th.semantic.text.secondary} style={{ textAlign: 'center' }}>{caption}</Text>
        <Button label={t(shownNotice === 'authError' ? 'common.retry' : 'review.confirm')} busy={busy} busyLabel={t('busy.send')} disabled={!core.review} onPress={() => void send()} />
      </>
    )
  return (
    <Screen
      bleed
      gap="none"
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack()} chips={<NetworkChips />} />}
      footer={footer}
    >
      <ReviewPanel
        values={values}
        checkedAt={core.checkedAt}
        rechecking={rechecking}
        acknowledged={acknowledged}
        feeUnknown={shownNotice === 'chainError'}
        {...(shownNotice && noticeKey ? { banner: { tone: NOTICE[shownNotice].tone, title: t(`${noticeKey}.title`), body: t(`${noticeKey}.body`) } } : {})}
        onRecheck={() => { setRechecking(true); void core.refresh().finally(() => setRechecking(false)) }}
        onEditRecipient={() => router.navigate({ pathname: '/send', params: { to: values.recipient } })}
        onEditAmount={() => goBack()}
      />
      <BottomSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        title={t(`review.${riskKey}.sheetTitle`)}
        secondary={{ label: t('review.ack'), danger: true, onPress: () => { setSheet(false); setAcknowledged(true) } }}
        primary={{ label: t('common.cancel'), onPress: () => setSheet(false) }}
      >
        <Text color={th.semantic.text.secondary}>{t(`review.${riskKey}.sheetBody`)}</Text>
        {values.risk === 'lookalike' ? <Compare current={values.recipient} previous={values.previous ?? values.recipient} /> : null}
      </BottomSheet>
    </Screen>
  )
}
