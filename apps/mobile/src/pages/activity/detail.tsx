import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Linking, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { clearTestTx, isFinal, isPolled, txNotice, txView, useTrackedTx, writePendingTx } from '@/features/send'
import { apiErrorKey } from '@/shared/api'
import { chain } from '@/shared/chain'
import { explorerUrl } from '@/shared/chain/port'
import { goBack } from '@/shared/lib/nav'
import { shortAddress } from '@/shared/lib/address'
import { useTheme } from '@/shared/theme'
import { BottomSheet, Button, Group, Screen, ScreenHeader, StatusLabel, StatusNotice, SummaryRow, Text } from '@/shared/ui'

const hhmm = (at: number) => new Date(at).toTimeString().slice(0, 5)

/**
 * C3-S41 거래 상세 for the pending tx in the kv. State comes from the chain (hld.md §4.1): receipt + `safe` block = Confirmed or Failed.
 * 상태 다시 확인 asks the chain; a Pending or Included send is also re-checked every 15 s while this screen is focused. Etherscan link is hidden while the adapter does not broadcast.
 */
export function TxDetailPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const { hash } = useLocalSearchParams<{ hash: string }>()
  const router = useRouter()
  const [confirmClear, setConfirmClear] = useState(false)
  const { tx: stored, checking, error, recheck } = useTrackedTx()
  const tx = stored?.hash === hash ? stored : null
  if (!tx) return <Redirect href="/activity" />
  const explorer = explorerUrl(chain, tx.hash)
  const view = txView(tx.state)
  const notice = txNotice(tx.state)
  const polled = isPolled(tx.state)
  return (
    <Screen
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack('/activity')} />}
      footer={
        <View style={{ gap: th.semantic.layout.fieldGap }}>
          {isFinal(tx.state) ? null : <Button label={t('detail.recheck')} busy={checking} onPress={() => void recheck()} />}
          {explorer ? (
            <Button label={t('detail.etherscan')} variant="ghost" onPress={() => void Linking.openURL(explorer)} />
          ) : (
            <Button label={t('detail.clearTest')} variant="ghost" onPress={() => setConfirmClear(true)} />
          )}
        </View>
      }
    >
      <View style={{ gap: th.semantic.layout.fieldGap }}>
        <StatusLabel state={view.status} label={t(view.label)} />
        <Text variant="title" accessibilityRole="header">{t('detail.title')}</Text>
      </View>
      <Group>
        <SummaryRow label={t('detail.sender')} value={account.name} />
        <SummaryRow label={t('review.network')} value={account.network} />
        <SummaryRow label={t('detail.amount')} value={`−${tx.amount} ${tx.asset}`} />
        <SummaryRow format="address" label={t('result.recipient')} value={tx.to} />
        <SummaryRow label={t('result.hash')} value={shortAddress(tx.hash)} />
        <SummaryRow label={t('result.fee')} value={`${tx.fee ?? '—'} ETH`} />
        <SummaryRow label={t('detail.lastChecked')} value={hhmm(tx.lastCheckedAt)} />
      </Group>
      {error ? <StatusNotice tone="warning" title={t(`${apiErrorKey(error)}.title`)} body={t(`${apiErrorKey(error)}.body`)} /> : null}
      <StatusNotice tone={notice.tone} title={t(notice.title)} body={t(notice.body)} />
      {polled ? <Text variant="body" color={th.semantic.text.secondary} accessibilityLiveRegion="polite">{t('detail.auto')}</Text> : null}
      {chain.broadcasts ? null : <StatusNotice tone="warning" title={t('notBroadcast.title')} body={t('notBroadcast.body')} />}
      <BottomSheet
        visible={confirmClear}
        onClose={() => setConfirmClear(false)}
        title={t('detail.clearTitle')}
        actions={
          <>
            <Button
              label={t('detail.clearConfirm')}
              onPress={() => {
                setConfirmClear(false)
                if (clearTestTx(chain, writePendingTx)) router.replace('/activity')
              }}
            />
            <Button label={t('common.cancel')} variant="ghost" onPress={() => setConfirmClear(false)} />
          </>
        }
      >
        <Text color={th.semantic.text.secondary}>{t('detail.clearBody')}</Text>
      </BottomSheet>
    </Screen>
  )
}
