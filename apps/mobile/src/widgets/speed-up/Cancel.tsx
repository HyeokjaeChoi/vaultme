// Figma: B-S23 Pending + cancel sheet 888:6228 (actions 888:5799, requested 888:6647); B/Fee compare 891:6915 with the new fee row off
import { useQuery } from '@tanstack/react-query'
import { fromUnits, type SpeedUpPlan } from '@vaultme/wallet-core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { canCancel, quoteCancel, readPendingTx, runCancel, sendFrom, writePendingTx } from '@/features/send'
import { apiErrorKey } from '@/shared/api'
import { chain } from '@/shared/chain'
import { loadPhrase, type PendingTx } from '@/shared/storage'
import { useTheme } from '@/shared/theme'
import { BottomSheet, Button, FeeCompare, StatusNotice, Text } from '@/shared/ui'

type Notice = 'authError' | 'chainError' | 'needsReview' | 'blocked' | 'unknown'

/**
 * "거래 취소" next to "속도 올리기" on a Pending send (S23, S41; ADR-0031) and its confirm sheet. The risky action is the safe one's opposite:
 * "돌아가기" is Primary, "취소하기" Secondary with the danger label (Figma 888:7079). Confirm runs `runCancel` (same device auth as a send).
 * The state stays Pending after it: the page shows "취소를 요청했어요" and hides both buttons. `onDone` = the record changed: reload it.
 */
export function Cancel({ tx, onDone }: { tx: PendingTx; onDone: () => void }) {
  const { t } = useTranslation()
  const th = useTheme()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [cause, setCause] = useState<unknown>(null)
  // The plan a NeedsReview answer carried: it replaces the one the sheet showed (no second read that could fail and leave the old one).
  const [fresh, setFresh] = useState<SpeedUpPlan | null>(null)
  const quote = useQuery({
    queryKey: ['cancel', tx.hash, tx.hashes?.length ?? 1, open] as const,
    queryFn: () => quoteCancel(tx, sendFrom(), chain),
    enabled: open,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: { persist: false },
  })
  if (!canCancel(tx, chain.broadcasts)) return null
  const plan = fresh ?? quote.data ?? null
  const short = plan !== null && plan.shortBy > 0n
  const over = plan?.overAbsCap === true // the signer refuses it: disabled with the blocked reason before device auth
  const shown: Notice | null = notice ?? (quote.isError ? 'chainError' : over ? 'blocked' : null)
  const noticeKey =
    shown === 'chainError'
      ? apiErrorKey(notice === 'chainError' ? cause : quote.error)
      : shown && shown !== 'unknown'
        ? (`send.${shown}` as const)
        : null

  const close = () => {
    setOpen(false)
    setNotice(null)
    setFresh(null)
  }
  const confirm = async () => {
    if (!plan || short || over || notice === 'unknown' || busy) return
    setBusy(true)
    setNotice(null)
    setCause(null)
    try {
      const out = await runCancel(tx, plan, sendFrom(), {
        chain,
        loadPhrase,
        readPending: readPendingTx,
        savePending: writePendingTx,
        now: Date.now,
        prompt: { title: t('send.authPrompt'), cancel: t('common.cancel') },
      })
      if (out.status === 'Sent' || out.status === 'NotPending') {
        close()
        onDone()
      } else if (out.status === 'Unknown') {
        // The answer was unclear: the sheet says so and cannot send a second cancel. The record is read again (it may hold the hash).
        setNotice('unknown')
        onDone()
      } else if (out.status === 'NeedsReview') {
        setFresh(out.plan)
        setNotice('needsReview')
      } else if (out.status === 'AuthError') setNotice('authError')
      else if (out.status === 'Blocked') setNotice('blocked')
      else if (out.status === 'ChainError') {
        setCause(out.error)
        setNotice('chainError')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button label={t('cancel.action')} variant="secondary" danger style={{ flex: 1 }} onPress={() => setOpen(true)} />
      <BottomSheet
        visible={open}
        onClose={close}
        dismissible={!busy}
        title={t('cancel.sheet.title')}
        actions={
          <>
            <Button
              label={t('cancel.sheet.confirm')}
              variant="secondary"
              danger
              busy={busy}
              busyLabel={t('cancel.sheet.busy')}
              disabled={!plan || short || over || notice === 'unknown'}
              onPress={() => void confirm()}
            />
            <Button label={t('cancel.sheet.back')} disabled={busy} onPress={close} />
          </>
        }
      >
        <Text color={th.semantic.text.secondary}>{t('cancel.sheet.body')}</Text>
        <View style={{ gap: th.semantic.layout.fieldGap }}>
          {shown === 'unknown' ? (
            <StatusNotice tone="warning" title={t('result.unknownTitle')} body={t('result.unknownBody')} />
          ) : noticeKey ? (
            <StatusNotice
              tone={shown === 'authError' || shown === 'needsReview' ? 'warning' : 'danger'}
              title={t(`${noticeKey}.title`)}
              body={t(`${noticeKey}.body`)}
            />
          ) : null}
          <FeeCompare
            notice={
              short ? t('review.feeShortBody', { amount: fromUnits(plan.shortBy, 'ETH') }) : t('cancel.sheet.notice')
            }
            noticeTone={short ? 'danger' : 'warning'}
            {...(short ? { noticeTitle: t('send.feeShort') } : {})}
            currentLabel={t('cancel.sheet.fee')}
            currentValue={plan ? `${fromUnits(plan.newFeeCap, 'ETH')} ETH` : '—'}
          />
        </View>
      </BottomSheet>
    </>
  )
}
