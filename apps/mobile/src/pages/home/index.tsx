// Figma: B-S10 Home 404:163 (dark 430:14606), testmode 457:4274, pending 423:742, new wallet 423:643, empty 515:29238, testnet sheet (chip), test-data sheet 515:29783, faucet row 486:77, B-S50 423:14215
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { assets } from '@/entities/asset/fixtures'
import { demoTx } from '@/entities/transaction/fixtures'
import { useAccountAddress, useBackupDone, useBackupGate } from '@/features/backup'
import { useLiveBalancesState } from '@/features/balances'
import { useHistory } from '@/features/history'
import { PushOptInSheet } from '@/features/push-optin/ui/PushOptInSheet'
import { useRestored } from '@/features/restore'
import { setPreselectedAsset, useTrackedTx } from '@/features/send'
import { chain } from '@/shared/chain'
import { useTheme } from '@/shared/theme'
import {
  ActionRow,
  AssetRow,
  BottomSheet,
  Button,
  ListItem,
  PortfolioBalance,
  ProductHeader,
  Screen,
  SectionHeader,
  Text,
} from '@/shared/ui'
import { RecentRows, fakeHistoryItems } from '@/widgets/activity-list/ActivityList'
import { FaucetAction } from '@/widgets/faucet-row/FaucetRow'
import { NetworkChips } from '@/widgets/network-chips/NetworkChips'

type SheetName = 'intro' | 'testData' | 'block' | 'push' | 'deposit' | null

const isZero = (v: string) => /^0(\.0+)?$/.test(v)

/**
 * B-S10 Home. Header (account + honesty chips), balance hero (the ETH holding, no price), Send left / Receive right
 * (Primary = Send; an empty wallet makes Receive Primary), the backup row while not backed up, "다른 자산" (the hero holds ETH, so only the other asset), and the 3 newest rows with "전체 보기".
 * The first deposit while not backed up opens the backup sheet once. Send without a backup goes to the S31 gate (SendGuard).
 * A new or empty wallet shows the empty state instead of assets and activity. The chips open their explainer sheets (no sheet opens by itself).
 * An empty wallet that is backed up or restored also shows the faucet row. A Pending or Included send blocks a new send behind a sheet (ADR-0006).
 * `variant=restored|pending|empty|unbacked` (unbacked = restored data without a backup: backup row, deposit sheet) and `sheet=intro|testdata|push|deposit|1` are __DEV__ capture overrides.
 */
export function HomePage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const { variant, sheet: sheetParam } = useLocalSearchParams<{ variant?: string; sheet?: string }>()
  const dev = (v: string) => __DEV__ && variant === v
  const backedUp = useBackupDone() || dev('empty')
  const gate = useBackupGate()
  const pending = useTrackedTx()
  const { balances: live, refresh: refreshBalances } = useLiveBalancesState()
  const { view, refresh: refreshHistory } = useHistory()
  const devSheet = (): SheetName =>
    sheetParam === 'intro'
      ? 'intro'
      : sheetParam === 'testdata'
        ? 'testData'
        : sheetParam === 'push'
          ? 'push'
          : sheetParam === 'deposit'
            ? 'deposit'
            : sheetParam === '1'
              ? 'block'
              : null
  const [sheet, setSheet] = useState<SheetName>(() => (__DEV__ && sheetParam ? devSheet() : null))
  useEffect(() => {
    if (__DEV__) setSheet(sheetParam ? devSheet() : null) // capture links reuse the mounted Home: follow the param
  }, [sheetParam])
  const restored = useRestored() || dev('restored') || dev('pending') || dev('unbacked')
  const balanceOf = (symbol: (typeof assets)[number]['symbol'], fixture: string) =>
    chain.broadcasts ? (live?.[symbol] ?? '—') : restored ? fixture : '0'
  // `?variant=pending` is a synthetic Pending send.
  const shownTx = dev('pending') ? demoTx('Pending') : pending.tx
  const blocked = shownTx !== pending.tx || pending.blocked
  const eth = balanceOf('ETH', assets[0].balance)
  const items = chain.broadcasts
    ? (view?.items ?? [])
    : fakeHistoryItems(shownTx).filter((i) => shownTx !== null || i.hash !== '1') // the example Pending row is for Activity; Home shows it only for a real send
  // Empty = nothing owned and nothing sent. With the real chain the history must have loaded and be empty too (a wallet that sent everything out is not "new").
  const faucetAddress = useAccountAddress() ?? (dev('empty') ? account.address : null)
  const empty =
    !shownTx &&
    [eth, balanceOf('USDC', assets[1].balance)].every(isZero) &&
    (!chain.broadcasts || (view !== null && items.length === 0))
  const close = () => setSheet(null)
  // Figma 586:97341: the first deposit while not backed up opens the backup sheet once. `markPromptShown` persists it; no other sheet is cut off.
  useEffect(() => {
    if (!gate.shouldPromptAfterDeposit || sheet !== null) return
    gate.markPromptShown()
    setSheet('deposit')
  }, [gate.shouldPromptAfterDeposit, sheet])
  return (
    <Screen
      edges={['top']}
      gap="none"
      topGap="none"
      onRefresh={() => Promise.all([refreshBalances(), refreshHistory()])}
    >
      <ProductHeader
        title={account.name}
        chips={<NetworkChips onPress={(test) => setSheet(test ? 'testData' : 'intro')} />}
      />
      <PortfolioBalance
        label={t('home.heroLabel')}
        value={eth}
        unit="ETH"
        note={t('home.priceNote')}
        {...(empty ? {} : { onLabelPress: () => router.push({ pathname: '/asset', params: { symbol: 'ETH' } }) })}
      />
      <ActionRow
        primary={empty ? 'receive' : 'send'}
        send={{
          label: t('home.send'),
          icon: 'send',
          onPress: () => {
            if (blocked) {
              setSheet('block')
              return
            }
            setPreselectedAsset('ETH')
            router.push('/send')
          },
        }}
        receive={{ label: t('home.receive'), icon: 'receive', onPress: () => router.push('/receive') }}
      />
      {(!restored || dev('unbacked')) && !backedUp ? (
        <ListItem
          title={t('home.backupRow')}
          icon="deviceWarning"
          iconColor={th.component.icon.status.warning}
          trailing={{ kind: 'disclosure' }}
          onPress={() => router.push('/backup')}
        />
      ) : null}
      {empty ? (
        <>
          <View style={{ gap: th.primitive.space[1], paddingTop: th.semantic.layout.sectionGap.product }}>
            <Text variant="headline">{t('home.emptyTitle')}</Text>
            <Text variant="bodySmall" color={th.semantic.text.secondary}>
              {t('home.emptyBody')}
            </Text>
          </View>
          {(restored || backedUp) && faucetAddress ? <FaucetAction address={faucetAddress} /> : null}
        </>
      ) : (
        <>
          <SectionHeader title={t('home.assets')} />
          {assets
            .filter((a) => a.symbol !== 'ETH')
            .map((a) => (
              // ETH is the hero above
              <AssetRow
                key={a.symbol}
                name={a.name}
                symbol={a.symbol}
                subtitle={t(`home.assetNote.${a.symbol}`)}
                balance={balanceOf(a.symbol, a.balance)}
                onPress={() => router.push({ pathname: '/asset', params: { symbol: a.symbol } })}
              />
            ))}
          {items.length > 0 ? (
            <>
              <SectionHeader
                title={t('home.recent')}
                link={t('home.viewAll')}
                onLinkPress={() => router.push('/activity')}
              />
              <RecentRows items={items} />
            </>
          ) : null}
        </>
      )}
      <BottomSheet
        visible={sheet === 'intro'}
        onClose={close}
        title={t('home.introTitle')}
        primary={{ label: t('home.introCta'), onPress: close }}
      >
        <Text color={th.semantic.text.secondary}>{t('home.introBody')}</Text>
      </BottomSheet>
      <BottomSheet
        visible={sheet === 'testData'}
        onClose={close}
        title={t('testData.title')}
        primary={{ label: t('home.testDataCta'), onPress: close }}
      >
        <Text color={th.semantic.text.secondary}>{t('testData.body')}</Text>
      </BottomSheet>
      <BottomSheet
        visible={sheet === 'block'}
        onClose={close}
        title={t('send.pendingBlock.title')}
        actions={
          <>
            <Button label={t('common.close')} variant="secondary" onPress={close} />
            <Button
              label={t('send.pendingBlock.view')}
              onPress={() => {
                close()
                router.push(shownTx ? { pathname: '/activity/[hash]', params: { hash: shownTx.hash } } : '/activity')
              }}
            />
          </>
        }
      >
        <Text color={th.semantic.text.secondary}>{t('send.pendingBlock.body')}</Text>
      </BottomSheet>
      <BottomSheet
        visible={sheet === 'deposit'}
        onClose={close}
        title={t('home.deposit.title')}
        secondary={{ label: t('common.later'), onPress: close }}
        primary={{
          label: t('home.deposit.cta'),
          onPress: () => {
            close()
            router.push('/backup')
          },
        }}
      >
        <Text color={th.semantic.text.secondary}>{t('home.deposit.body')}</Text>
      </BottomSheet>
      <PushOptInSheet visible={sheet === 'push'} onClose={close} />
    </Screen>
  )
}
