import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { assets } from '@/entities/asset/fixtures'
import { useBackupDone } from '@/features/backup'
import { useLiveBalances } from '@/features/balances'
import { useRestored } from '@/features/restore'
import { usePendingTx } from '@/features/send'
import { chain } from '@/shared/chain'
import { useTheme } from '@/shared/theme'
import { AssetRow, BackupStatus, BottomSheet, Button, Group, PortfolioBalance, ProductHeader, Screen, Text } from '@/shared/ui'
import { TestDataNotice } from '@/widgets/test-data-notice/TestDataNotice'

/** R-S10R / R-S10N Home. New wallet (default): zero balances, and the backup card until the backup is done (kv flag). `variant=restored` (S10R) = the wallet came from a restore (kv flag; `?variant=restored` is a __DEV__ capture override): quantities, no backup card, receive allowed (Q16). */
export function HomePage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const { variant } = useLocalSearchParams<{ variant?: string }>()
  const backedUp = useBackupDone()
  const pending = usePendingTx()
  const live = useLiveBalances()
  const [blockSheet, setBlockSheet] = useState(false)
  const restored = useRestored() || (__DEV__ && variant === 'restored')
  return (
    <Screen edges={['top']}>
      <ProductHeader title={account.name} subtitle={account.network} detailsLabel={t('home.details')} />
      <PortfolioBalance label={t('home.totalLabel')} value={t('home.unavailable')} note={t('home.unavailableNote')} />
      <View style={{ flexDirection: 'row', gap: th.semantic.layout.fieldGap }}>
        <Button label={t('home.send')} style={{ flex: 1 }} onPress={() => (pending.blocked ? setBlockSheet(true) : router.push('/send'))} />
        <Button label={t('home.receive')} variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/receive')} />
      </View>
      <TestDataNotice />
      {!restored && !backedUp ? <BackupStatus title={t('home.backupTitle')} body={t('home.backupBody')} cta={t('home.backupCta')} onPress={() => router.push('/backup')} /> : null}
      <Group>
        {assets.map((a) => (
          <AssetRow key={a.symbol} name={a.name} symbol={a.symbol} balance={chain.broadcasts ? (live?.[a.symbol] ?? '—') : restored ? a.balance : '0'} note={t('home.noQuote')} />
        ))}
      </Group>
      <BottomSheet
        visible={blockSheet}
        onClose={() => setBlockSheet(false)}
        title={t('send.pendingBlock.title')}
        actions={
          <>
            <Button
              label={t('send.pendingBlock.view')}
              onPress={() => {
                setBlockSheet(false)
                router.push(pending.tx ? { pathname: '/activity/[hash]', params: { hash: pending.tx.hash } } : '/activity')
              }}
            />
            <Button label={t('common.close')} variant="ghost" onPress={() => setBlockSheet(false)} />
          </>
        }
      >
        <Text color={th.semantic.text.secondary}>{t('send.pendingBlock.body')}</Text>
      </BottomSheet>
    </Screen>
  )
}
