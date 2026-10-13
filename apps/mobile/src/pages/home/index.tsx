import { useLocalSearchParams, useRouter } from 'expo-router'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { assets } from '@/entities/asset/fixtures'
import { useTheme } from '@/shared/theme'
import { AssetRow, BackupStatus, Button, PortfolioBalance, ProductHeader, Screen } from '@/shared/ui'

/** S10 Home. `variant=new` (S10N, before backup): backup card, zero balances. `variant=restored` (S10R): quantities, no backup card. */
export function HomePage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const { variant } = useLocalSearchParams<{ variant?: string }>()
  const isNew = variant !== 'restored'
  return (
    // Frame S10N uses group gap (16); S10R uses product section gap (24).
    <Screen edges={['top']} gap={isNew ? 'group' : 'section'}>
      <ProductHeader title={account.name} subtitle={account.network} detailsLabel={t('home.details')} />
      <PortfolioBalance label={t('home.totalLabel')} value={t('home.unavailable')} note={t('home.unavailableNote')} />
      <View style={{ flexDirection: 'row', gap: th.semantic.layout.fieldGap }}>
        <Button label={t('home.send')} style={{ flex: 1 }} onPress={() => router.push('/send')} />
        <Button label={t('home.receive')} variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/receive')} />
      </View>
      {/* Static: backup flow (S31/S03) is not part of C2a. */}
      {isNew ? <BackupStatus title={t('home.backupTitle')} body={t('home.backupBody')} cta={t('home.backupCta')} /> : null}
      {assets.map((a) => (
        <AssetRow key={a.symbol} name={a.name} symbol={a.symbol} balance={isNew ? '0' : a.balance} note={t('home.noQuote')} />
      ))}
    </Screen>
  )
}
