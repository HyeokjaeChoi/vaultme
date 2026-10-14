import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { useAccountAddress, useBackupDone } from '@/features/backup'
import { useRestored } from '@/features/restore'
import { PushOptInSheet } from '@/features/push-optin/ui/PushOptInSheet'
import { BackupStatus, Button, PlaceholderQr, ReceivePanel, Screen, ScreenHeader, Text } from '@/shared/ui'
import { useTheme } from '@/shared/theme'
import { goBack } from '@/shared/lib/nav'

/**
 * R-S30 받기. QR is a labelled placeholder: no real QR is rendered (AGENTS rule 4). `sheet=1` opens S50. Copy and share are inert in C2a.
 * The address shows only once the backup is done (kv flag; ux-flow §3: no backup -> S31), otherwise the backup notice shows instead.
 * The address is the wallet's own, derived at creation and kept in kv; without one the screen redirects to Start. `backedUp=1` is a __DEV__-only design-capture override that shows the fixture address.
 */
export function ReceivePage() {
  const { t } = useTranslation()
  const th = useTheme()
  const { sheet, backedUp } = useLocalSearchParams<{ sheet?: string; backedUp?: string }>()
  const [open, setOpen] = useState(sheet === '1')
  const backupDone = useBackupDone()
  const restored = useRestored()
  const done = backupDone || restored // a restored wallet receives right away (Q16); that is not backup proof
  const stored = useAccountAddress()
  const demo = __DEV__ && backedUp === '1' // dev/design-capture override: shows the fixture address
  const router = useRouter()
  const address = stored ?? (demo ? account.address : null)
  if (!address) return <Redirect href="/" /> // no wallet on this install: never show a fixture address as the user's own
  if (!done && !demo) {
    return (
      <Screen header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack()} />}>
        <Text variant="title" accessibilityRole="header">{t('receive.title')}</Text>
        <BackupStatus title={t('home.backupTitle')} body={t('home.backupBody')} cta={t('home.backupCta')} onPress={() => router.push('/backup')} />
      </Screen>
    )
  }
  return (
    <Screen
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack()} />}
      footer={
        <View style={{ flexDirection: 'row', gap: th.semantic.layout.fieldGap }}>
          <Button label={t('receive.copy')} variant="secondary" style={{ flex: 1 }} />
          <Button label={t('receive.share')} style={{ flex: 1 }} />
        </View>
      }
    >
      <Text variant="title" accessibilityRole="header">{t('receive.title')}</Text>
      <View style={{ alignItems: 'center' }}>
        <PlaceholderQr note={t('receive.qrNote')} />
      </View>
      <ReceivePanel account={account.name} network={account.network} address={address} note={t('receive.warning')} />
      <PushOptInSheet visible={open} onClose={() => setOpen(false)} />
    </Screen>
  )
}
