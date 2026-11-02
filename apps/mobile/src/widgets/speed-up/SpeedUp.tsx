// Figma: B-S23 Pending with actions 888:5799 (S41 888:5913), speed-up sheet 888:6058, sheet ETH short 888:6136; B/Fee compare 891:6915
import { useQuery } from '@tanstack/react-query'
import { fromUnits, type SpeedUpPlan } from '@vaultme/wallet-core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { canSpeedUp, quoteSpeedUp, readPendingTx, runSpeedUp, sendFrom, writePendingTx } from '@/features/send'
import { apiErrorKey } from '@/shared/api'
import { chain } from '@/shared/chain'
import { haptic } from '@/shared/lib/haptics'
import { loadPhrase, type PendingTx } from '@/shared/storage'
import { useTheme } from '@/shared/theme'
import { BottomSheet, Button, FeeCompare, StatusNotice, Text } from '@/shared/ui'

type Notice = 'authError' | 'chainError' | 'needsReview' | 'blocked' | 'unknown'

/**
 * "속도 올리기" under the status area of a Pending send (S23, S41; ADR-0031) and its confirm sheet. The sheet reads a fresh fee plan (`quoteSpeedUp`);
 * ETH short disables the primary button with the reason. Confirm runs `runSpeedUp` (same device auth as a send). `onDone` = the record changed: reload it.
 */
export function SpeedUp({ tx, onDone }: { tx: PendingTx; onDone: () => void }) {
  const { t } = useTranslation()
  const th = useTheme()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [cause, setCause] = useState<unknown>(null)
  // The plan a NeedsReview answer carried: it replaces the one the sheet showed (no second read that could fail and leave the old one).
  const [fresh, setFresh] = useState<SpeedUpPlan | null>(null)
  const quote = useQuery({
    queryKey: ['speedUp', tx.hash, tx.hashes?.length ?? 1, open] as const,
    queryFn: () => quoteSpeedUp(tx, sendFrom(), chain),
    enabled: open,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: { persist: false },
  })
  if (!canSpeedUp(tx, chain.broadcasts)) return null
  const plan = fresh ?? quote.data ?? null
  const eth = (wei: bigint) => `${fromUnits(wei, 'ETH')} ETH`
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
      const out = await runSpeedUp(tx, plan, sendFrom(), {
        chain,
        loadPhrase,
        readPending: readPendingTx,
        savePending: writePendingTx,
        now: Date.now,
        prompt: { title: t('send.authPrompt'), cancel: t('common.cancel') },
      })
      if (out.status === 'Sent') {
        haptic.success()
        close()
        onDone()
      } else if (out.status === 'Unknown') {
        // The answer was unclear: no success haptic or line. The hash may be recorded, so the record is read again; the sheet says the result is unknown and cannot be sent twice.
        setNotice('unknown')
        onDone()
      } else if (out.status === 'NotPending') {
        close()
        onDone()
      } else if (out.status === 'NeedsReview') {
        setFresh(out.plan)
        setNotice('needsReview')
      } else if (out.status === 'AuthError') setNotice('authError')
      else if (out.status === 'Blocked') setNotice('blocked')
      else if (out.status === 'ChainError') {
        haptic.error()
        setCause(out.error)
        setNotice('chainError')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button label={t('speedUp.action')} variant="secondary" onPress={() => setOpen(true)} />
      <BottomSheet
        visible={open}
        onClose={close}
        dismissible={!busy}
        title={t('speedUp.sheet.title')}
        actions={
          <>
            <Button label={t('speedUp.sheet.back')} variant="secondary" disabled={busy} onPress={close} />
            <Button
              label={t('speedUp.sheet.confirm')}
              busy={busy}
              busyLabel={t('speedUp.sheet.busy')}
              disabled={!plan || short || over || notice === 'unknown'}
              onPress={() => void confirm()}
            />
          </>
        }
      >
        <Text color={th.semantic.text.secondary}>{t('speedUp.sheet.body')}</Text>
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
              short ? t('review.feeShortBody', { amount: fromUnits(plan.shortBy, 'ETH') }) : t('speedUp.sheet.notice')
            }
            noticeTone={short ? 'danger' : 'info'}
            {...(short ? { noticeTitle: t('send.feeShort') } : {})}
            currentLabel={t('speedUp.sheet.current')}
            currentValue={plan ? eth(plan.currentFeeCap) : '—'}
            newLabel={t('speedUp.sheet.next')}
            newValue={plan ? eth(plan.newFeeCap) : '—'}
            newSub={plan ? t('speedUp.sheet.extra', { amount: fromUnits(plan.extra, 'ETH') }) : ''}
          />
        </View>
      </BottomSheet>
    </>
  )
}
