// Figma: B-S10 Home 404:163 (dark 430:14606), testmode 457:4274, pending 423:742, new wallet 423:643, empty 515:29238, first-launch sheet 515:29519, test-data sheet 515:29783, B-S50 423:14215
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { assets } from '@/entities/asset/fixtures'
import { demoTx } from '@/entities/transaction/fixtures'
import { useBackupDone } from '@/features/backup'
import { useLiveBalances } from '@/features/balances'
import { useHistory } from '@/features/history'
import { PushOptInSheet } from '@/features/push-optin/ui/PushOptInSheet'
import { useRestored } from '@/features/restore'
import { useTrackedTx } from '@/features/send'
import { chain } from '@/shared/chain'
import { getIntroSeen, setIntroSeen } from '@/shared/storage'
import { useTheme } from '@/shared/theme'
import { ActionRow, AssetRow, BottomSheet, Button, EmptyState, ListItem, PortfolioBalance, ProductHeader, Screen, SectionHeader, Text } from '@/shared/ui'
import { RecentRows, fakeHistoryItems } from '@/widgets/activity-list/ActivityList'
import { NetworkChips } from '@/widgets/network-chips/NetworkChips'

type SheetName = 'intro' | 'testData' | 'block' | 'push' | null

const introSeen = () => {
  try {
    return getIntroSeen()
  } catch {
    return true // kv not open: never block Home with the sheet
  }
}
const isZero = (v: string) => /^0(\.0+)?$/.test(v)

/**
 * B-S10 Home. Header (account + honesty chips), balance hero (the ETH holding, no price), Send left / Receive right
 * (Primary = Send; an empty wallet makes Receive Primary), the backup row of a new wallet, assets, and the 3 newest rows with "전체 보기".
 * A new or empty wallet shows the empty state instead of assets and activity. The first launch shows the testnet sheet once (kv flag);
 * the chips open their explainer sheets. A Pending or Included send blocks a new send behind a sheet (Q47).
 * `variant=restored|pending|empty` and `sheet=first|testdata|push|1` are __DEV__ capture overrides.
 */
export function HomePage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const { variant, sheet: sheetParam } = useLocalSearchParams<{ variant?: string; sheet?: string }>()
  const dev = (v: string) => __DEV__ && variant === v
  const backedUp = useBackupDone() || dev('empty')
  const pending = useTrackedTx()
  const live = useLiveBalances()
  const { view } = useHistory()
  const devSheet = (): SheetName => (sheetParam === 'first' ? 'intro' : sheetParam === 'testdata' ? 'testData' : sheetParam === 'push' ? 'push' : sheetParam === '1' ? 'block' : null)
  const [sheet, setSheet] = useState<SheetName>(() => (__DEV__ && sheetParam ? devSheet() : introSeen() ? null : 'intro'))
  useEffect(() => {
    if (__DEV__) setSheet(sheetParam ? devSheet() : null) // capture links reuse the mounted Home: follow the param
  }, [sheetParam])
  const restored = useRestored() || dev('restored') || dev('pending')
  const balanceOf = (symbol: (typeof assets)[number]['symbol'], fixture: string) => (chain.broadcasts ? (live?.[symbol] ?? '—') : restored ? fixture : '0')
  // `?variant=pending` is a synthetic Pending send.
  const shownTx = dev('pending') ? demoTx('Pending') : pending.tx
  const blocked = shownTx !== pending.tx || pending.blocked
  const eth = balanceOf('ETH', assets[0].balance)
  const items = chain.broadcasts ? (view?.items ?? []) : fakeHistoryItems(shownTx).filter((i) => shownTx !== null || i.hash !== '1') // the example Pending row is for Activity; Home shows it only for a real send
  // Empty = nothing owned and nothing sent. With the real chain the history must have loaded and be empty too (a wallet that sent everything out is not "new").
  const empty = !shownTx && [eth, balanceOf('USDC', assets[1].balance)].every(isZero) && (!chain.broadcasts || (view !== null && items.length === 0))
  const close = () => setSheet(null)
  const closeIntro = () => {
    try {
      setIntroSeen(true)
    } catch {
      // kv closed: the sheet shows again next launch
    }
    close()
  }
  return (
    <Screen edges={['top']} gap="none" topGap="none">
      <ProductHeader title={account.name} chips={<NetworkChips onTestnetPress={() => setSheet('intro')} onTestDataPress={() => setSheet('testData')} />} />
      <PortfolioBalance label={t('home.heroLabel')} value={eth} unit="ETH" note={t('home.priceNote')} />
      <ActionRow
        primary={empty ? 'receive' : 'send'}
        send={{ label: t('home.send'), icon: 'send', onPress: () => (blocked ? setSheet('block') : router.push('/send')) }}
        receive={{ label: t('home.receive'), icon: 'receive', onPress: () => router.push('/receive') }}
      />
      {!restored && !backedUp ? (
        <ListItem title={t('home.backupRow')} icon="deviceWarning" iconColor={th.component.icon.status.warning} trailing={{ kind: 'disclosure' }} onPress={() => router.push('/backup')} />
      ) : null}
      {empty ? (
        <EmptyState title={t('home.emptyTitle')} body={t('home.emptyBody')} />
      ) : (
        <>
          <SectionHeader title={t('home.assets')} />
          {assets.map((a) => (
            <AssetRow key={a.symbol} name={a.name} symbol={a.symbol} balance={balanceOf(a.symbol, a.balance)} onPress={() => router.push({ pathname: '/asset', params: { symbol: a.symbol } })} />
          ))}
          {items.length > 0 ? (
            <>
              <SectionHeader title={t('home.recent')} link={t('home.viewAll')} onLinkPress={() => router.push('/activity')} />
              <RecentRows items={items} />
            </>
          ) : null}
        </>
      )}
      <BottomSheet
        visible={sheet === 'intro'}
        onClose={closeIntro}
        title={t('home.introTitle')}
        primary={{ label: t('home.introCta'), onPress: closeIntro }}
      >
        <Text color={th.semantic.text.secondary}>{t('home.introBody')}</Text>
      </BottomSheet>
      <BottomSheet visible={sheet === 'testData'} onClose={close} title={t('testData.title')} primary={{ label: t('home.testDataCta'), onPress: close }}>
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
      <PushOptInSheet visible={sheet === 'push'} onClose={close} />
    </Screen>
  )
}
