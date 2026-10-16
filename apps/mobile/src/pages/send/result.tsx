import { useRouter } from 'expo-router'
import { View } from 'react-native'
import { Redirect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { resultCopy, txView, useTrackedTx } from '@/features/send'
import { showAmount } from '@/shared/lib/amount'
import { useTheme } from '@/shared/theme'
import { Button, Screen, StatusHero, StatusNotice, SummaryRow } from '@/shared/ui'
import { chain } from '@/shared/chain'

/**
 * C2b-S23 보내기 결과 (Figma 423:15795 Pending, 423:15852 Included, 423:15909 Confirmed, 423:15959 Failed, 423:16009 Unknown, 423:16059 Replaced).
 * Status hero, a warning while a send may still go through, then flat detail rows. Reads the kv pending record and re-checks it every 15 s while focused.
 */
export function SendResultPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const { tx, checking, recheck } = useTrackedTx()
  if (!tx) return <Redirect href="/home" />
  const copy = resultCopy(tx.state)
  const unknown = tx.state === 'Unknown'
  const toHistory = () => { router.dismissAll(); router.replace('/activity') }
  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <View style={{ gap: th.semantic.layout.fieldGap }}>
          {unknown ? <Button label={t('result.recheck')} busy={checking} onPress={() => void recheck()} /> : <Button label={t('result.history')} onPress={toHistory} />}
          <Button label={t(unknown ? 'result.history' : 'result.home')} variant="ghost" onPress={unknown ? toHistory : () => { router.dismissAll(); router.replace('/home') }} />
        </View>
      }
    >
      <StatusHero tone={copy.tone} title={t(copy.title)} {...(copy.body ? { body: t(copy.body) } : {})} />
      {copy.warn ? <StatusNotice tone="warning" title={t(copy.warn)} /> : null}
      {chain.broadcasts ? null : <StatusNotice tone="warning" title={t('notBroadcast.title')} body={t('notBroadcast.body')} />}
      <View>
        <SummaryRow label={t('result.statusLabel')} value={t(txView(tx.state).label)} />
        <SummaryRow label={t('result.amount')} value={showAmount(tx.amount, tx.asset, 'exact')} />
        <SummaryRow format="address" label={t('result.recipient')} value={tx.to} />
        <SummaryRow label={t('result.network')} value={account.network} />
        <SummaryRow label={t('result.fee')} value={`${tx.fee ?? '—'} ETH`} />
        <SummaryRow format="address" label={t('result.hash')} value={tx.hash} />
      </View>
    </Screen>
  )
}
