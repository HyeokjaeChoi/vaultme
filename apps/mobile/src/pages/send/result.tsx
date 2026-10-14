import { useRouter } from 'expo-router'
import { View } from 'react-native'
import { Redirect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { txNotice, txView, useTrackedTx } from '@/features/send'
import { shortAddress } from '@/shared/lib/address'
import { useTheme } from '@/shared/theme'
import { Button, Group, Screen, StatusLabel, StatusNotice, SummaryRow, Text } from '@/shared/ui'
import { chain } from '@/shared/chain'

/** C2b-S23 보내기 결과: status label, title, body, summary, test notice. Pending or Unknown (Unknown copy: ux-flow.md S23). Reads the kv pending record. */
export function SendResultPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const { tx } = useTrackedTx() // re-checks a Pending or Included send every 15 s while focused
  if (!tx) return <Redirect href="/home" />
  const view = txView(tx.state)
  const copy = txNotice(tx.state)
  const gap = th.semantic.layout.fieldGap
  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <View style={{ gap }}>
          <Button label={t('result.history')} onPress={() => { router.dismissAll(); router.replace('/activity') }} />
          <Button label={t('result.home')} variant="ghost" onPress={() => { router.dismissAll(); router.replace('/home') }} />
        </View>
      }
    >
      <View style={{ gap }}>
        <StatusLabel state={view.status} label={t(view.label)} />
        <Text variant="title" accessibilityRole="header">{t(copy.title)}</Text>
        <Text variant="body" color={th.semantic.text.secondary}>{t(copy.body)}</Text>
      </View>
      <Group>
        <SummaryRow label={t('detail.sender')} value={account.name} />
        <SummaryRow label={t('review.network')} value={account.network} />
        <SummaryRow label={t('result.amount')} value={`${tx.amount} ${tx.asset}`} />
        <SummaryRow format="address" label={t('result.recipient')} value={tx.to} />
        <SummaryRow label={t('result.hash')} value={shortAddress(tx.hash)} />
        <SummaryRow label={t('result.fee')} value={`${tx.fee ?? '—'} ETH`} />
      </Group>
      {chain.broadcasts ? null : <StatusNotice tone="warning" title={t('notBroadcast.title')} body={t('notBroadcast.body')} />}
    </Screen>
  )
}
