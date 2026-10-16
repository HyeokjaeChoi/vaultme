import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { useAccountAddress, useBackupDone } from '@/features/backup'
import { useRestored } from '@/features/restore'
import { PushOptInSheet } from '@/features/push-optin/ui/PushOptInSheet'
import { Button, PlaceholderQr, Screen, ScreenHeader, StatusNotice, SummaryRow, Text } from '@/shared/ui'
import { useTheme } from '@/shared/theme'
import { goBack } from '@/shared/lib/nav'

/**
 * B-S30 받기 (Figma 423:14163, dark 423:15512). QR is a labelled placeholder: no real QR is rendered (AGENTS rule 4). `sheet=1` opens S50. Copy and share are inert in C2a.
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
  const done = (backupDone || restored) && !(__DEV__ && backedUp === '0') // a restored wallet receives right away (Q16); that is not backup proof
  const stored = useAccountAddress()
  const demo = __DEV__ && (backedUp === '1' || backedUp === '0') // dev/design-capture override: shows the fixture address (`0` = backup not done: S31)
  const router = useRouter()
  const address = stored ?? (demo ? account.address : null)
  if (!address) return <Redirect href="/" /> // no wallet on this install: never show a fixture address as the user's own
  if (!done) {
    // B-S31 (Figma 423:13750): backup first, then the address shows.
    return (
      <Screen
        gap="section"
        header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack()} />}
        footer={
          <View style={{ gap: th.semantic.layout.fieldGap }}>
            <Button label={t('common.later')} variant="ghost" onPress={() => goBack()} />
            <Button label={t('home.backupCta')} onPress={() => router.push('/backup')} />
          </View>
        }
      >
        <View style={{ gap: th.semantic.layout.fieldGap }}>
          <Text variant="title1" accessibilityRole="header">{t('receive.backup.title')}</Text>
          <Text variant="body" color={th.semantic.text.secondary}>{t('receive.backup.body')}</Text>
        </View>
        <StatusNotice tone="warning" title={t('receive.backup.noticeTitle')} body={t('receive.backup.noticeBody')} />
      </Screen>
    )
  }
  return (
    <Screen
      gap="section"
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack()} />}
      footer={
        <View style={{ flexDirection: 'row', gap: th.semantic.layout.fieldGap }}>
          <Button label={t('receive.share')} variant="secondary" style={{ flex: 1 }} />
          <Button label={t('receive.copy')} style={{ flex: 1 }} />
        </View>
      }
    >
      <View style={{ gap: th.semantic.layout.fieldGap }}>
        <Text variant="title1" accessibilityRole="header">{t('receive.title')}</Text>
        <Text variant="body" color={th.semantic.text.secondary}>{t('receive.accountNetwork')}</Text>
      </View>
      <PlaceholderQr note={t('receive.qrNote')} />
      <SummaryRow format="address" label={t('receive.addressLabel')} value={address} />
      <StatusNotice tone="warning" title={t('receive.warning')} />
      <PushOptInSheet visible={open} onClose={() => setOpen(false)} />
    </Screen>
  )
}
