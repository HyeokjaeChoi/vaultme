import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { resolveReview } from '@/entities/transaction/review'
import { diffGroups, displayGroups } from '@/shared/lib/address'
import { useTheme } from '@/shared/theme'
import { textStyle } from '@/shared/theme/fonts'
import { BottomSheet, Button, Screen, ScreenHeader, StatusNotice, Text } from '@/shared/ui'
import { ReviewPanel } from '@/widgets/review-panel/ReviewPanel'
import { goBack } from '@/shared/lib/nav'
import { runSend, sendFrom, useReviewCore, readPendingTx, writePendingTx, type SendOutcome } from '@/features/send'
import { apiErrorKey } from '@/shared/api'
import { chain } from '@/shared/chain'
import { loadPhrase } from '@/shared/storage'

const SHOWN_GROUPS = 4 // sheet compares only the leading chunks, then "…"

/** Info notice body of the address-check sheet: previous vs current address, only differing chunks marked. */
function Compare({ current, previous }: { current: string; previous: string }) {
  const { t } = useTranslation()
  const th = useTheme()
  const fg = th.component.statusNotice.info.fg
  const diff = diffGroups(current, previous)
  const mark = { ...textStyle({ ...th.semantic.typography.label }), color: th.semantic.status.danger.fg, textDecorationLine: 'underline' as const }
  const cut = (a: string) => displayGroups(a).slice(0, SHOWN_GROUPS)
  return (
    <View>
      <Text variant="body" color={fg}>{`${t('review.lookalike.previous')}   ${cut(previous).join(' ')} …`}</Text>
      <Text variant="body" color={fg}>
        {`${t('review.lookalike.current')}   `}
        {cut(current).map((g, i) => (
          <Text key={i} color={fg}>
            {i > 0 ? ' ' : ''}
            <Text style={diff.includes(i) ? mark : undefined}>{g}</Text>
          </Text>
        ))}
        {' …'}
      </Text>
    </View>
  )
}

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
 * R-S22 검토. `risk=1` = R-S22L look-alike: confirm opens the address-check sheet (ACK first). `sheet=1` opens it on arrival (R-S22L+Sheet).
 * Confirm = per-send OS auth + sign + submit through the ChainPort (fake in C2b). Cancel stays here silently.
 */
export function ReviewPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const { risk, sheet: sheetParam, to, amount, notice: noticeParam } = useLocalSearchParams<{ risk?: string; sheet?: string; to?: string; amount?: string; notice?: string }>()
  const base = resolveReview(to, amount, risk === '1')
  const core = useReviewCore(base.recipient, base.amount.replace(' ETH', ''))
  const values = core.review ? resolveReview(to, amount, risk === '1', core.review) : base
  const [busy, setBusy] = useState(false)
  // `?notice=` is a __DEV__ capture override (Figma C3-S22 notice states).
  const [notice, setNotice] = useState<Notice | null>(__DEV__ && noticeParam && noticeParam in NOTICE ? (noticeParam as Notice) : null)
  const [cause, setCause] = useState<unknown>(null)
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
      router.dismissAll()
      router.push('/send/result')
    } else if (out.status === 'Cancelled') return
    else {
      if (out.status === 'NeedsReview' && !(await core.refresh())) return // the new fee and total replace the old ones; if the re-read failed, its own error shows instead
      if (out.status === 'ChainError') setCause(out.error)
      setNotice(out.status === 'AuthError' ? 'authError' : out.status === 'ChainError' ? 'chainError' : out.status === 'NeedsReview' ? 'needsReview' : out.status === 'Blocked' ? 'blocked' : 'pending')
    }
  }
  const shownNotice: Notice | null = notice ?? (core.error && core.error !== 'chain' ? 'prepareError' : core.error === 'chain' ? 'chainError' : null)
  // A failed network call says why (offline, busy, clock); anything else keeps the generic send.chainError line.
  const noticeKey = shownNotice === 'chainError' ? apiErrorKey(notice === 'chainError' ? cause : core.cause) : shownNotice ? NOTICE[shownNotice].key : null
  const isRisk = values.previous !== null
  const [sheet, setSheet] = useState(isRisk && sheetParam === '1')
  // Same route re-opened with ?sheet=1 keeps this screen mounted, so follow the param.
  useEffect(() => {
    if (isRisk && sheetParam === '1') setSheet(true)
  }, [isRisk, sheetParam])
  return (
    <Screen
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack()} />}
      footer={
        notice === 'blocked' ? (
          // Blocked: no way to send. Home only (Figma C3-S22 Blocked 379:2187).
          <Button label={t('result.home')} variant="secondary" onPress={() => { router.dismissAll(); router.replace('/home') }} />
        ) : (
          <Button label={t(notice === 'needsReview' ? 'review.reconfirm' : notice === 'authError' ? 'common.retry' : 'review.confirm')} busy={busy} disabled={!core.review} onPress={() => (isRisk ? setSheet(true) : void send())} />
        )
      }
    >
      {shownNotice && noticeKey ? <StatusNotice tone={NOTICE[shownNotice].tone} title={t(`${noticeKey}.title`)} body={t(`${noticeKey}.body`)} /> : null}
      <ReviewPanel values={values} checkedAt={core.checkedAt} onRecalc={() => void core.refresh()} onEditRecipient={() => router.dismissTo('/send')} onEditAmount={() => router.dismissTo({ pathname: '/send/amount', params: { to: values.recipient, amount: values.amount.replace(' ETH', '') } })} />
      <BottomSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        title={t('review.lookalike.sheetTitle')}
        actions={
          <>
            <Button label={t('common.cancel')} onPress={() => setSheet(false)} />
            <Button
              label={t('review.lookalike.proceed')}
              variant="ghost"
              onPress={() => {
                setSheet(false)
                void send()
              }}
            />
          </>
        }
      >
        <Text color={th.semantic.text.secondary}>{t('review.lookalike.sheetBody')}</Text>
        <StatusNotice tone="info" title={t('review.lookalike.compareTitle')} body={<Compare current={values.recipient} previous={values.previous ?? values.recipient} />} />
      </BottomSheet>
    </Screen>
  )
}
