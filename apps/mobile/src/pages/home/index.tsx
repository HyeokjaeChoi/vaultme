import { useLocalSearchParams, useRouter } from 'expo-router'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { assets } from '@/entities/asset/fixtures'
import { useBackupDone } from '@/features/backup'
import { useTheme } from '@/shared/theme'
import { AssetRow, BackupStatus, Button, Group, PortfolioBalance, ProductHeader, Screen } from '@/shared/ui'

/** R-S10R / R-S10N Home. New wallet (default): zero balances, and the backup card until the backup is done (kv flag). `variant=restored` (S10R): quantities, no backup card, receive allowed (Q16). */
export function HomePage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const { variant } = useLocalSearchParams<{ variant?: string }>()
  const backedUp = useBackupDone()
  const restored = variant === 'restored'
  return (
    <Screen edges={['top']}>
      <ProductHeader title={account.name} subtitle={account.network} detailsLabel={t('home.details')} />
      <PortfolioBalance label={t('home.totalLabel')} value={t('home.unavailable')} note={t('home.unavailableNote')} />
      <View style={{ flexDirection: 'row', gap: th.semantic.layout.fieldGap }}>
        <Button label={t('home.send')} style={{ flex: 1 }} onPress={() => router.push('/send')} />
        <Button label={t('home.receive')} variant="secondary" style={{ flex: 1 }} onPress={() => router.push(restored ? '/receive?backedUp=1' : '/receive')} />
      </View>
      {!restored && !backedUp ? <BackupStatus title={t('home.backupTitle')} body={t('home.backupBody')} cta={t('home.backupCta')} onPress={() => router.push('/backup')} /> : null}
      <Group>
        {assets.map((a) => (
          <AssetRow key={a.symbol} name={a.name} symbol={a.symbol} balance={restored ? a.balance : '0'} note={t('home.noQuote')} />
        ))}
      </Group>
    </Screen>
  )
}
