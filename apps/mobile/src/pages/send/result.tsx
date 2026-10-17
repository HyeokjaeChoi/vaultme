// Figma: B-S23 Send result (Pending 423:15795, Included 423:15852, Confirmed 423:15909, Failed 423:15959 + Reason, Unknown 423:16009, Replaced 423:16059, Pending test mode)
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef } from 'react'
import { Redirect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { networkFact } from '@/entities/account/fixtures'
import { demoTx } from '@/entities/transaction/fixtures'
import type { TxState } from '@/features/send'
import { isPolled, resultCopy, useTrackedTx } from '@/features/send'
import { haptic } from '@/shared/lib/haptics'
import { showAmount } from '@/shared/lib/amount'
import { useTestMode } from '@/shared/chain/useTestMode'
import { useTheme } from '@/shared/theme'
import { AmountHero, Block, Button, ProgressSteps, SectionBand, Screen, ScreenHeader, StatusNotice, SummaryRow } from '@/shared/ui'
import { BackHandler, View } from 'react-native'
import { NetworkChips } from '@/widgets/network-chips/NetworkChips'

/**
 * B-S23 보내기 결과: a centered end moment (asset logo + status badge, headline, Figure amount, sentence), the 보냄 -> 블록 포함 -> 확정 progress for Pending / Included / Confirmed only,
 * then a band and flat detail rows. Fee label: "예상 네트워크 수수료" until the network has it, "네트워크 수수료" once included. Replaced has no fee row.
 * A send the fake adapter never put on the network is a test send: "테스트 거래예요", no progress, no warning line, no fee (the chip says it too).
 * A failure reason line shows only when the record carries a confirmed reason (`failReason`). Success and failure give a haptic once.
 * Reads the kv pending record and re-checks it every 15 s while focused. `?demo=<state>` (+ `&reason=gas`; `&real=1` shows the real-chain variant) is a __DEV__ capture override: a synthetic send in that state.
 */
export function SendResultPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const { demo, reason, real } = useLocalSearchParams<{ demo?: string; reason?: string; real?: string }>()
  const tracked = useTrackedTx()
  const { checking, recheck } = tracked
  const testMode = useTestMode()
  const tx = __DEV__ && demo ? { ...demoTx(demo as TxState), ...(reason === 'gas' ? { failReason: 'outOfGas' as const } : {}) } : tracked.tx
  const state = tx?.state
  const seen = useRef(state) // the state at mount: reopening an already final result gives no haptic, only a change seen here does
  useEffect(() => {
    if (state === seen.current) return
    seen.current = state
    if (state === 'Confirmed') haptic.success()
    else if (state === 'Failed') haptic.error()
  }, [state])
  // Android hardware back = the "확인" action (Home). It must never reach the amount screen: that is a re-send path.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      router.dismissAll()
      router.replace('/home')
      return true
    })
    return () => sub.remove()
  }, [router])
  if (!tx) return <Redirect href="/home" />
  const copy = resultCopy(tx.state)
  const test = testMode && !(__DEV__ && real === '1') && isPolled(tx.state) // the fake adapter keeps a send Pending forever: it was never on the network
  const toHome = () => { router.dismissAll(); router.replace('/home') }
  const toDetail = () => router.push({ pathname: '/activity/[hash]', params: { hash: tx.hash } })
  const resend = () => {
    router.dismissAll()
    router.replace('/home')
    router.push({ pathname: '/review', params: { to: tx.to, amount: tx.amount } })
  }
  const [figure, unit] = showAmount(tx.amount, tx.asset, 'exact').split(' ')
  const lines = (test ? t('result.testBody') : t(copy.body)).split('\n')
  const progress = !test && (tx.state === 'Pending' || tx.state === 'Included' || tx.state === 'Confirmed') ? tx.state : null
  const feeLabel = tx.state === 'Pending' || tx.state === 'Unknown' ? 'result.fee' : 'result.feeFinal'
  const showFee = !test && tx.state !== 'Replaced'
  const unknown = tx.state === 'Unknown'
  const failed = tx.state === 'Failed'
  return (
    <Screen
      bleed
      gap="none"
      header={<ScreenHeader chips={<NetworkChips />} />}
      footer={
        <>
          {unknown ? (
            <Button label={t('result.recheck')} busy={checking} busyLabel={t('busy.recheck')} onPress={() => void recheck()} />
          ) : failed ? (
            <Button label={t('result.resend')} onPress={resend} />
          ) : (
            <Button label={t('result.ok')} onPress={toHome} />
          )}
          {failed ? <Button label={t('result.ok')} variant="secondary" onPress={toHome} /> : <Button label={t('result.details')} variant="ghost" size="sm" link onPress={toDetail} />}
        </>
      }
    >
      <AmountHero
        result={{ badge: test ? 'info' : copy.tone, title: test ? t('result.testTitle') : t(copy.title) }}
        asset={tx.asset === 'USDC' ? 'USDC' : 'ETH'}
        amount={figure ?? tx.amount}
        unit={unit ?? tx.asset}
        lines={lines}
        celebrate={tx.state === 'Confirmed' && !test}
        {...(failed ? { link: { label: t('result.details'), onPress: toDetail } } : {})}
        {...(tx.state === 'Failed' && tx.failReason ? { note: t(`result.failReason.${tx.failReason}`) } : {})}
      />
      {progress ? (
        <View style={{ paddingHorizontal: th.semantic.layout.screen.padding, paddingBottom: th.primitive.space[6] }}>
          <ProgressSteps state={progress} labels={[t('result.progress.sent'), t('result.progress.included'), t('result.progress.confirmed')]} />
        </View>
      ) : null}
      <SectionBand />
      <Block>
        {!test && copy.warn ? <StatusNotice tone="warning" title={t(copy.warn)} /> : null}
        <SummaryRow format="address" label={t('result.recipient')} value={tx.to} />
        <SummaryRow label={t('result.network')} fact value={networkFact} />
        {showFee ? <SummaryRow label={t(feeLabel)} value={`${tx.fee ?? '—'} ETH`} /> : null}
      </Block>
    </Screen>
  )
}
