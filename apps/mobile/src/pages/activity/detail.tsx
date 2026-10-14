import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Linking, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { clearTestTx, readPendingTx, writePendingTx } from '@/features/send'
import { chain } from '@/shared/chain'
import { explorerUrl } from '@/shared/chain/port'
import { goBack } from '@/shared/lib/nav'
import { shortAddress } from '@/shared/lib/address'
import { useTheme } from '@/shared/theme'
import { BottomSheet, Button, Group, Screen, ScreenHeader, StatusLabel, StatusNotice, SummaryRow, Text } from '@/shared/ui'

const hhmm = (at: number) => new Date(at).toTimeString().slice(0, 5)

/** C2b-S41 거래 상세 for the pending tx in the kv. 상태 다시 확인: asks for the receipt (real adapter) and updates the last-checked time; the fake adapter only updates the time. Etherscan link is hidden while the adapter does not broadcast. */
export function TxDetailPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const { hash } = useLocalSearchParams<{ hash: string }>()
  const router = useRouter()
  const [confirmClear, setConfirmClear] = useState(false)
  const [stored, setStored] = useState(readPendingTx)
  const tx = stored !== 'corrupt' && stored?.hash === hash ? stored : null
  if (!tx) return <Redirect href="/activity" />
  const explorer = explorerUrl(chain, tx.hash)
  const unknown = tx.state === 'Unknown'
  const recheck = async () => {
    let state = tx.state
    if (chain.broadcasts) {
      // A receipt means the tx is in a block, which lifts the Q47 send block. Success vs reverted and `safe` finality are #44.
      try {
        if (await chain.getReceipt(tx.hash as `0x${string}`)) state = 'Included'
      } catch {
        return // could not ask: keep the old state and the old checked time
      }
    }
    const next = { ...tx, state, lastCheckedAt: Date.now() }
    writePendingTx(next)
    setStored(next)
  }
  return (
    <Screen
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack('/activity')} />}
      footer={
        <View style={{ gap: th.semantic.layout.fieldGap }}>
          <Button label={t('detail.recheck')} onPress={() => void recheck()} />
          {explorer ? (
            <Button label={t('detail.etherscan')} variant="ghost" onPress={() => void Linking.openURL(explorer)} />
          ) : (
            <Button label={t('detail.clearTest')} variant="ghost" onPress={() => setConfirmClear(true)} />
          )}
        </View>
      }
    >
      <View style={{ gap: th.semantic.layout.fieldGap }}>
        <StatusLabel state={unknown ? 'unknown' : 'pending'} label={t(unknown ? 'activity.unknown' : 'activity.pending')} />
        <Text variant="title" accessibilityRole="header">{t('detail.title')}</Text>
        <Text variant="body" color={th.semantic.text.secondary}>{t(unknown ? 'result.unknownTitle' : 'result.title')}</Text>
      </View>
      <Group>
        <SummaryRow label={t('detail.amount')} value={`−${tx.amount} ${tx.asset}`} />
        <SummaryRow format="address" label={t('result.recipient')} value={tx.to} />
        <SummaryRow label={t('result.hash')} value={shortAddress(tx.hash)} />
        <SummaryRow label={t('result.fee')} value={`${tx.fee ?? '—'} ETH`} />
        <SummaryRow label={t('detail.lastChecked')} value={hhmm(tx.lastCheckedAt)} />
      </Group>
      <Text variant="body" color={th.semantic.text.secondary} accessibilityLiveRegion="polite">{t('detail.auto')}</Text>
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
