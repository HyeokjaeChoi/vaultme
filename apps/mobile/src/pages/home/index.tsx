import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { assets } from '@/entities/asset/fixtures'
import { demoTx } from '@/entities/transaction/fixtures'
import { useBackupDone } from '@/features/backup'
import { useLiveBalances } from '@/features/balances'
import { useRestored } from '@/features/restore'
import { usePendingTx } from '@/features/send'
import { chain } from '@/shared/chain'
import { showAmount } from '@/shared/lib/amount'
import { clock } from '@/shared/lib/time'
import { useTheme } from '@/shared/theme'
import { ActionRow, ActivityRow, AssetRow, BottomSheet, Button, PortfolioBalance, ProductHeader, Screen, SectionHeader, StatusNotice, Text } from '@/shared/ui'
import { TestDataNotice } from '@/widgets/test-data-notice/TestDataNotice'

/**
 * R-S10R / R-S10N / R-S10P Home (Figma 404:163, 404:522 dark, 423:643 new wallet, 423:742 pending).
 * Hero = network label + the ETH holding (no price, so no total value). New wallet (default): zero balances and the backup notice until the backup is done (kv flag).
 * `variant=restored` (S10R) = the wallet came from a restore (kv flag; `?variant=restored` is a __DEV__ capture override): quantities, no backup notice, receive allowed (Q16).
 * A Pending or Included send shows under 진행 중 above the assets and blocks a new send behind a sheet (Q47).
 */
export function HomePage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const { variant, sheet } = useLocalSearchParams<{ variant?: string; sheet?: string }>()
  const backedUp = useBackupDone()
  const pending = usePendingTx()
  const live = useLiveBalances()
  const [blockSheet, setBlockSheet] = useState(__DEV__ && sheet === '1')
  const restored = useRestored() || (__DEV__ && (variant === 'restored' || variant === 'pending'))
  const balanceOf = (symbol: (typeof assets)[number]['symbol'], fixture: string) => (chain.broadcasts ? (live?.[symbol] ?? '—') : restored ? fixture : '0')
  // `?variant=pending` is a __DEV__ capture override: a synthetic Pending send.
  const shownTx = __DEV__ && variant === 'pending' ? demoTx('Pending') : pending.tx
  const blocked = shownTx !== pending.tx || pending.blocked
  const inProgress = blocked && shownTx ? shownTx : null
  return (
    <Screen edges={['top']} gap="none">
      <ProductHeader title={account.name} subtitle={account.network} detailsLabel={t('home.details')} />
      <PortfolioBalance label={t('home.testnetLabel')} value={`${balanceOf('ETH', assets[0].balance)} ETH`} note={t('home.priceNote')} />
      <ActionRow
        primary={{ label: t('home.send'), icon: 'send', onPress: () => (blocked ? setBlockSheet(true) : router.push('/send')) }}
        secondary={{ label: t('home.receive'), icon: 'receive', onPress: () => router.push('/receive') }}
      />
      <TestDataNotice />
      {!restored && !backedUp ? <StatusNotice tone="warning" title={t('home.backupTitle')} body={t('home.backupBody')} link={{ label: t('home.backupCta'), onPress: () => router.push('/backup') }} /> : null}
      {inProgress ? (
        <View>
          <SectionHeader title={t('home.inProgress')} />
          <ActivityRow
            title={t('home.sendingTitle')}
            detail={t('home.sendingBody')}
            time={clock(inProgress.createdAt)}
            amount={`−${showAmount(inProgress.amount, inProgress.asset, 'floor')}`}
            kind="send"
            status="pending"
            statusLabel={t('activity.pending')}
            onPress={() => router.push({ pathname: '/activity/[hash]', params: { hash: inProgress.hash } })}
          />
        </View>
      ) : null}
      <View>
        <SectionHeader title={t('home.assets')} />
        {assets.map((a) => (
          <AssetRow key={a.symbol} name={a.name} symbol={a.symbol} balance={balanceOf(a.symbol, a.balance)} onPress={() => router.push({ pathname: '/asset', params: { symbol: a.symbol } })} />
        ))}
      </View>
      <BottomSheet
        visible={blockSheet}
        onClose={() => setBlockSheet(false)}
        title={t('send.pendingBlock.title')}
        actions={
          <>
            <Button label={t('common.close')} variant="secondary" onPress={() => setBlockSheet(false)} />
            <Button
              label={t('send.pendingBlock.view')}
              onPress={() => {
                setBlockSheet(false)
                router.push(shownTx ? { pathname: '/activity/[hash]', params: { hash: shownTx.hash } } : '/activity')
              }}
            />
          </>
        }
      >
        <Text color={th.semantic.text.secondary}>{t('send.pendingBlock.body')}</Text>
      </BottomSheet>
    </Screen>
  )
}
