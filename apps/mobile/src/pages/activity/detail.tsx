// Figma: B-S41 Transaction detail Confirmed 423:16327, Unknown 423:16381
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Linking, Pressable, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { demoTx } from '@/entities/transaction/fixtures'
import type { TxState } from '@/features/send'
import { clearTestTx, isFinal, isPolled, resultCopy, txView, useTrackedTx, writePendingTx } from '@/features/send'
import { apiErrorKey } from '@/shared/api'
import { chain } from '@/shared/chain'
import { explorerUrl } from '@/shared/chain/port'
import { goBack } from '@/shared/lib/nav'
import { showAmount } from '@/shared/lib/amount'
import { useTheme } from '@/shared/theme'
import { BottomSheet, Button, Screen, ScreenHeader, StatusHero, StatusNotice, SummaryRow, Text } from '@/shared/ui'

const hhmm = (at: number) => new Date(at).toTimeString().slice(0, 5)

/**
 * B-S41 거래 상세 for the send in the kv. State comes from the chain (hld.md §4.1): receipt + `safe` block = Confirmed or Failed.
 * Hero and notices share the S23 copy (`resultCopy`). 상태 다시 확인 asks the chain; a Pending or Included send is also re-checked every 15 s while focused.
 * `?demo=<state>` is a __DEV__ capture override: a synthetic send in that state.
 */
export function TxDetailPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const { hash, demo } = useLocalSearchParams<{ hash: string; demo?: string }>()
  const router = useRouter()
  const [confirmClear, setConfirmClear] = useState(false)
  const { tx: stored, checking, error, recheck } = useTrackedTx()
  const tx = __DEV__ && demo ? demoTx(demo as TxState) : stored?.hash === hash ? stored : null
  if (!tx) return <Redirect href="/activity" />
  const explorer = explorerUrl(chain, tx.hash)
  const copy = resultCopy(tx.state)
  const polled = isPolled(tx.state)
  const final = isFinal(tx.state)
  const lastChecked = `${t('detail.lastChecked', { time: hhmm(tx.lastCheckedAt) })}${polled ? ` ${t('detail.auto')}` : ''}`
  return (
    <Screen
      gap="none"
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack('/activity')} title={t('detail.title')} />}
      footer={
        final ? undefined : (
          <View style={{ gap: th.semantic.layout.fieldGap }}>
            <Button label={t('detail.recheck')} busy={checking} onPress={() => void recheck()} />
            <Button label={t('result.history')} variant="ghost" onPress={() => goBack('/activity')} />
          </View>
        )
      }
    >
      <StatusHero tone={copy.tone} title={t(copy.title)} {...(copy.body ? { body: t(copy.body) } : {})} />
      {copy.warn ? <StatusNotice tone="warning" title={t(copy.warn)} /> : null}
      {final ? null : <StatusNotice tone="info" title={lastChecked} />}
      {error ? <StatusNotice tone="warning" title={t(`${apiErrorKey(error)}.title`)} body={t(`${apiErrorKey(error)}.body`)} /> : null}
      {chain.broadcasts ? null : <StatusNotice tone="warning" title={t('notBroadcast.title')} body={t('notBroadcast.body')} />}
      <View>
        <SummaryRow label={t('result.statusLabel')} value={t(txView(tx.state).label)} />
        <SummaryRow label={t('result.amount')} value={showAmount(tx.amount, tx.asset, 'exact')} />
        <SummaryRow format="address" label={t('result.recipient')} value={tx.to} />
        {final ? <SummaryRow label={t('detail.sender')} value={account.name} /> : null}
        <SummaryRow label={t('result.network')} value={account.network} />
        <SummaryRow label={t('result.fee')} value={`${tx.fee ?? '—'} ETH`} />
        <SummaryRow format="address" label={t('result.hash')} value={tx.hash} />
      </View>
      {explorer ? (
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(explorer)} style={{ minHeight: th.primitive.size.touch_min, justifyContent: 'center' }}>
          <Text variant="label" color={th.semantic.text.link}>{t('detail.etherscan')}</Text>
        </Pressable>
      ) : (
        // Test mode only (fake adapter): not in Figma, keeps the way to unblock a new send.
        <Pressable accessibilityRole="link" onPress={() => setConfirmClear(true)} style={{ minHeight: th.primitive.size.touch_min, justifyContent: 'center' }}>
          <Text variant="label" color={th.semantic.text.link}>{t('detail.clearTest')}</Text>
        </Pressable>
      )}
      <BottomSheet
        visible={confirmClear}
        onClose={() => setConfirmClear(false)}
        title={t('detail.clearTitle')}
        actions={
          <>
            <Button label={t('common.cancel')} variant="secondary" onPress={() => setConfirmClear(false)} />
            <Button
              label={t('detail.clearConfirm')}
              onPress={() => {
                setConfirmClear(false)
                if (clearTestTx(chain, writePendingTx)) router.replace('/activity')
              }}
            />
          </>
        }
      >
        <Text color={th.semantic.text.secondary}>{t('detail.clearBody')}</Text>
      </BottomSheet>
    </Screen>
  )
}
