import { useRouter } from 'expo-router'
import { View } from 'react-native'
import { Redirect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { usePendingTx } from '@/features/send'
import { shortAddress } from '@/shared/lib/address'
import { useTheme } from '@/shared/theme'
import { Button, Group, Screen, StatusLabel, StatusNotice, SummaryRow, Text } from '@/shared/ui'
import { chain } from '@/shared/chain'

/** C2b-S23 보내기 결과: status label, title, body, summary, test notice. Pending or Unknown (Unknown copy: ux-flow.md S23). Reads the kv pending record. */
export function SendResultPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const { tx } = usePendingTx()
  if (!tx) return <Redirect href="/home" />
  const unknown = tx.state === 'Unknown'
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
        <StatusLabel state={unknown ? 'unknown' : 'pending'} label={t(unknown ? 'activity.unknown' : 'activity.pending')} />
        <Text variant="title" accessibilityRole="header">{t(unknown ? 'result.unknownTitle' : 'result.title')}</Text>
        <Text variant="body" color={th.semantic.text.secondary}>{t(unknown ? 'result.unknownBody' : 'result.body')}</Text>
      </View>
      <Group>
        <SummaryRow label={t('result.amount')} value={`${tx.amount} ${tx.asset}`} />
        <SummaryRow format="address" label={t('result.recipient')} value={tx.to} />
        <SummaryRow label={t('result.hash')} value={shortAddress(tx.hash)} />
        <SummaryRow label={t('result.fee')} value={`${tx.fee ?? '—'} ETH`} />
      </Group>
      {chain.broadcasts ? null : <StatusNotice tone="warning" title={t('notBroadcast.title')} body={t('notBroadcast.body')} />}
    </Screen>
  )
}
