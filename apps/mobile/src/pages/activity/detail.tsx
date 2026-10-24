// Figma: B-S41 Transaction detail (Confirmed 423:16327, real chain 460:4988, Unknown 423:16381, API error 457:17668, test mode + clear sheet)
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Linking, Pressable, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { networkFact } from '@/entities/account'
import { demoTx } from '@/entities/transaction'
import { findCachedRow, hashOfId, rowCopy, type HistoryItem } from '@/features/history'
import type { TxState } from '@/features/send'
import { clearTestTx, isFinal, isPolled, resultCopy, txView, useTrackedTx, writePendingTx } from '@/features/send'
import { ApiError, apiErrorKey, historyCache } from '@/shared/api'
import { chain } from '@/shared/chain'
import { explorerUrl } from '@/shared/chain'
import { useTestMode } from '@/shared/chain'
import { haptic } from '@/shared/lib/haptics'
import { goBack } from '@/shared/lib/nav'
import { showAmount } from '@/shared/lib/amount'
import { getAccountAddress } from '@/shared/storage'
import { factTime } from '@/shared/lib/time'
import { useTheme } from '@/shared/theme'
import {
  AmountHero,
  BottomSheet,
  Block,
  Button,
  Icon,
  Screen,
  ScreenHeader,
  SectionBand,
  StatusNotice,
  SummaryRow,
  Text,
} from '@/shared/ui'
import { AddressText } from '@/shared/ui'
import { fakeHistoryItems } from '@/widgets/activity-list'
import { NetworkChips } from '@/widgets/network-chips'

// __DEV__ capture only (`?row=in|out`): a history row as in Figma Flow 4 A 742:2487 / B 742:2584.
const DEV_ADDRESS = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
const devHistoryRow = (dir: 'in' | 'out'): HistoryItem => ({
  id: 'dev:0',
  hash: '0xa1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
  kind: dir === 'in' ? 'receive' : 'send',
  asset: 'ETH',
  amount: '0.05',
  counterparty: '0x123456789aBCdef0123456789AbCDEF012345678',
  at: new Date(2026, 9, 16, 9, 41).getTime(),
  ...txView('Confirmed'),
  local: false,
  blockNumber: 5812044,
})

const hhmm = (at: number) => new Date(at).toTimeString().slice(0, 5)

function EtherscanRow({ url }: { url: string }) {
  const { t } = useTranslation()
  const th = useTheme()
  return (
    <Block>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={t('detail.etherscan')}
        onPress={() => void Linking.openURL(url)}
        style={{
          minHeight: th.primitive.size.touch_min,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text variant="headline">{t('detail.etherscan')}</Text>
        <Icon name="external" size={th.component.icon.size.control} color={th.component.icon.action.fg} />
      </Pressable>
    </Block>
  )
}

/**
 * B-S41 for a history row without a local record (incoming, or a send from another device). Shows the one tapped movement.
 * History has no confirmation state, so: status 성공/실패 only, no fee row, no recheck, no clear sheet (Figma Flow 4 A 742:2487, B 742:2584).
 * No counterparty (contract creation, example rows): the 보낸 사람 / 받는 사람 block is left out.
 */
function RowDetail({
  row,
  address,
  real,
  example,
}: {
  row: HistoryItem
  address: string | null
  real: string | undefined
  example: boolean
}) {
  const { t } = useTranslation()
  const copy = rowCopy(row)
  const explorer =
    explorerUrl(chain, row.hash) ?? (__DEV__ && real === '1' ? `https://sepolia.etherscan.io/tx/${row.hash}` : null)
  const [figure, unit] = showAmount(row.amount, row.asset, 'exact').split(' ')
  return (
    <Screen
      bleed
      gap="none"
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack('/activity')} chips={<NetworkChips />} />}
    >
      <AmountHero
        result={{ badge: example ? 'info' : copy.badge, title: example ? t('result.testTitle') : t(copy.title) }}
        asset={row.asset === 'USDC' ? 'USDC' : 'ETH'}
        amount={figure ?? row.amount}
        unit={unit ?? row.asset}
        lines={example ? t('result.testBody').split('\n') : copy.body ? t(copy.body).split('\n') : []}
      />
      <SectionBand />
      {row.counterparty ? (
        <>
          <Block title={t(copy.counterpartyTitle)}>
            <AddressText address={row.counterparty} />
          </Block>
          <SectionBand />
        </>
      ) : null}
      <Block title={t('detail.infoTitle')}>
        <SummaryRow label={t('detail.time')} fact value={factTime(row.at)} />
        <SummaryRow label={t('result.statusLabel')} value={example ? t('detail.state.test') : t(copy.statusWord)} />
        {/^0x[0-9a-fA-F]{64}$/.test(row.hash) ? (
          <SummaryRow format="address" plain fact label={t('detail.hashTitle')} value={row.hash} />
        ) : null}
        {address ? <SummaryRow format="address" plain label={t(copy.accountLabel)} value={address} /> : null}
        <SummaryRow label={t('result.network')} fact value={networkFact} />
        {row.blockNumber !== undefined ? (
          <SummaryRow label={t('detail.block')} fact value={String(row.blockNumber).replace(/\B(?=(\d{3})+$)/g, ',')} />
        ) : null}
      </Block>
      {explorer ? (
        <>
          <SectionBand />
          <EtherscanRow url={explorer} />
        </>
      ) : null}
    </Screen>
  )
}

/**
 * B-S41 거래 상세 for the send in the kv. State comes from the chain (ARCHITECTURE.md#invariants): receipt + `safe` block = Confirmed or Failed.
 * Hero shares the S23 copy (`resultCopy`); a send the fake adapter never broadcast is a test send ("테스트 거래예요", state "예시", no fee row, 테스트 거래 지우기 with a confirm sheet).
 * Blocks: 받는 주소 / 거래 정보 (시각, 상태, 보낸 계정 from the record — hidden for a record saved before #32, 네트워크, 네트워크 수수료) / 거래 해시 + Etherscan row (real network only). 상태 다시 확인 asks the chain; a Pending or Included send is also re-checked every 15 s while focused.
 * `?demo=<state>` | `?row=in|out` (history row) (+ `&real=1`, `&err=1`, `&sheet=1`) is a __DEV__ capture override: a synthetic send in that state.
 */
export function TxDetailPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const {
    hash: id, // the row id (`<hash>:<seq>`; the local send's id is its hash)
    demo,
    row: devRow,
    real,
    sheet,
    err,
  } = useLocalSearchParams<{
    hash: string
    row?: string
    demo?: string
    real?: string
    sheet?: string
    err?: string
  }>()
  const router = useRouter()
  const [confirmClear, setConfirmClear] = useState(__DEV__ && sheet === '1')
  const { tx: stored, checking, error: trackedError, recheck } = useTrackedTx()
  const testMode = useTestMode()
  const error = __DEV__ && err === '1' ? new ApiError('network', 0, true, 'offline') : trackedError // `?err=1` is a __DEV__ capture override (Figma 457:17668)
  // The local record wins over a history row with the same hash.
  const tx =
    __DEV__ && demo
      ? demoTx(demo as TxState)
      : stored?.hash.toLowerCase() === hashOfId(id).toLowerCase()
        ? stored
        : null
  if (!tx) {
    const address = __DEV__ && devRow ? DEV_ADDRESS : getAccountAddress()
    const cached = findCachedRow(historyCache.get(), address, id)
    const row =
      (__DEV__ && (devRow === 'in' || devRow === 'out') ? devHistoryRow(devRow) : null) ??
      cached ??
      (testMode ? fakeHistoryItems(null).find((i) => i.id === id) : undefined)
    return row ? (
      <RowDetail row={row} address={address} real={real} example={testMode && !cached} />
    ) : (
      <Redirect href="/activity" />
    )
  }
  const explorer =
    explorerUrl(chain, tx.hash) ?? (__DEV__ && real === '1' ? `https://sepolia.etherscan.io/tx/${tx.hash}` : null)
  const copy = resultCopy(tx.state)
  const test = testMode && isPolled(tx.state)
  const final = isFinal(tx.state)
  const [figure, unit] = showAmount(tx.amount, tx.asset, 'exact').split(' ')
  const stateWord = test
    ? t('detail.state.test')
    : tx.state === 'Confirmed'
      ? t('detail.state.confirmed')
      : tx.state === 'Unknown'
        ? t('detail.state.unknown')
        : t(txView(tx.state).label)
  const lastChecked = `${t('detail.lastChecked', { time: hhmm(tx.lastCheckedAt) })}.${isPolled(tx.state) ? ` ${t('detail.auto')}` : ''}`
  const showFee = !test && tx.state !== 'Replaced'
  return (
    <Screen
      bleed
      gap="none"
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack('/activity')} chips={<NetworkChips />} />}
      footer={
        final || test ? undefined : (
          <Button
            label={t('detail.recheck')}
            busy={checking}
            busyLabel={t('busy.recheck')}
            onPress={() => void recheck()}
          />
        )
      }
    >
      {error ? (
        <View style={{ paddingHorizontal: th.semantic.layout.screen.padding, paddingTop: th.primitive.space[2] }}>
          <StatusNotice
            tier="banner"
            tone="warning"
            title={t(`${apiErrorKey(error)}.title`)}
            body={t(`${apiErrorKey(error)}.body`)}
          />
        </View>
      ) : null}
      <AmountHero
        result={{ badge: test ? 'info' : copy.tone, title: test ? t('result.testTitle') : t(copy.title) }}
        asset={tx.asset === 'USDC' ? 'USDC' : 'ETH'}
        amount={figure ?? tx.amount}
        unit={unit ?? tx.asset}
        lines={(test ? t('result.testBody') : t(copy.body)).split('\n')}
      />
      <SectionBand />
      <Block title={t('detail.recipientTitle')}>
        <AddressText address={tx.to} />
      </Block>
      <SectionBand />
      <Block title={t('detail.infoTitle')}>
        <SummaryRow label={t('detail.time')} fact value={factTime(tx.createdAt)} />
        <SummaryRow label={t('result.statusLabel')} value={stateWord} />
        <SummaryRow format="address" plain fact label={t('detail.hashTitle')} value={tx.hash} />
        {tx.accountIndex !== undefined ? (
          <SummaryRow label={t('detail.sender')} value={t('detail.accountName', { n: tx.accountIndex + 1 })} />
        ) : null}
        <SummaryRow label={t('result.network')} fact value={networkFact} />
        {tx.blockNumber !== undefined && !test ? (
          <SummaryRow label={t('detail.block')} fact value={String(tx.blockNumber).replace(/\B(?=(\d{3})+$)/g, ',')} />
        ) : null}
        {showFee ? (
          <SummaryRow
            label={t(tx.state === 'Pending' || tx.state === 'Unknown' ? 'result.fee' : 'result.feeFinal')}
            value={tx.fee ? `${tx.fee} ETH` : '—'}
          />
        ) : null}
        {final || test ? null : <StatusNotice tone="info" title={lastChecked} />}
      </Block>
      {test ? (
        <>
          <SectionBand />
          <Block>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                haptic.warning()
                setConfirmClear(true)
              }}
              style={{ minHeight: th.primitive.size.touch_min, justifyContent: 'center' }}
            >
              <Text variant="headline" color={th.semantic.status.danger.fg}>
                {t('detail.clearTest')}
              </Text>
            </Pressable>
          </Block>
        </>
      ) : explorer ? (
        <>
          <SectionBand />
          <EtherscanRow url={explorer} />
        </>
      ) : null}
      <BottomSheet
        visible={confirmClear}
        onClose={() => setConfirmClear(false)}
        title={t('detail.clearTitle')}
        secondary={{
          label: t('detail.clearConfirm'),
          danger: true,
          onPress: () => {
            setConfirmClear(false)
            if (clearTestTx(chain, writePendingTx)) router.replace('/activity')
          },
        }}
        primary={{ label: t('common.cancel'), onPress: () => setConfirmClear(false) }}
      >
        <Text color={th.semantic.text.secondary}>{t('detail.clearBody')}</Text>
      </BottomSheet>
    </Screen>
  )
}
