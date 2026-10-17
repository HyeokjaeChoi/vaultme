// Figma: B-S30 받기 (423:14163, dark 423:15512), B-S31 backup required (423:13750)
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Share, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { useAccountAddress, useBackupDone } from '@/features/backup'
import { useRestored } from '@/features/restore'
import { PushOptInSheet } from '@/features/push-optin/ui/PushOptInSheet'
import { goBack } from '@/shared/lib/nav'
import { useCopy } from '@/shared/lib/useCopy'
import { useTheme } from '@/shared/theme'
import { Button, EmptyState, Icon, QrCode, Screen, ScreenHeader, Text } from '@/shared/ui'
import { AddressText } from '@/shared/ui/AddressBlock'
import { FaucetRow } from '@/widgets/faucet-row/FaucetRow'
import { NetworkChips } from '@/widgets/network-chips/NetworkChips'

/**
 * B-S30 받기. A real QR of the wallet's own address (decoded in CI against the address, test/qr-decode.test.ts), the full address (Address L, first and last group strong), a network caption.
 * Copy gives a light haptic and the Copied label (shared `useCopy`); the faucet row (테스트 ETH 받기, first block of the footer stack: faucet, copy, share) copies the address and opens QuickNode; share opens the OS share sheet with the address. `sheet=1` opens S50.
 * The address shows only once the backup is done (kv flag; ux-flow §3: no backup -> S31). The address is the wallet's own, derived at creation and kept in kv; without one the screen redirects to Start.
 * `backedUp=1` is a __DEV__-only design-capture override that shows the fixture address (`0` = backup not done: S31).
 */
export function ReceivePage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const { sheet, backedUp, copied: copiedParam } = useLocalSearchParams<{ sheet?: string; backedUp?: string; copied?: string }>()
  const [open, setOpen] = useState(sheet === '1')
  const { copied, copy } = useCopy(t('receive.copied'), __DEV__ && copiedParam === '1')
  const backupDone = useBackupDone()
  const restored = useRestored()
  const done = __DEV__ && backedUp ? backedUp === '1' : backupDone || restored // a restored wallet receives right away (Q16); that is not backup proof
  const stored = useAccountAddress()
  const demo = __DEV__ && (backedUp === '1' || backedUp === '0')
  const address = stored ?? (demo ? account.address : null)
  if (!address) return <Redirect href="/" /> // no wallet on this install: never show a fixture address as the user's own
  const header = <ScreenHeader backLabel={t('common.back')} onBack={() => goBack()} chips={<NetworkChips />} />
  const title = (
    <View>
      <Text variant="title1" accessibilityRole="header">{t('receive.title')}</Text>
      {done ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.semantic.layout.fieldGap }}>
          <Icon name="account" size={th.component.icon.account.size} color={th.component.icon.account.fg} />
          <Text variant="bodySmall" color={th.semantic.text.secondary}>{t('receive.account')}</Text>
        </View>
      ) : null}
    </View>
  )
  if (!done) {
    // B-S31: backup first, then the address shows.
    return (
      <Screen
        header={header}
        footer={
          <>
            <Button label={t('home.backupCta')} onPress={() => router.push('/backup')} />
            <Button label={t('common.later')} variant="ghost" onPress={() => goBack()} />
          </>
        }
      >
        {title}
        <EmptyState icon="deviceWarning" tone="warning" title={t('receive.backup.title')} body={t('receive.backup.body')} />
      </Screen>
    )
  }
  return (
    <Screen
      header={header}
      gap="none"
      footerLead={<FaucetRow address={address} inFooter />}
      footer={
        <>
          <Button label={copied ? t('receive.copied') : t('receive.copy')} copied={copied} onPress={() => void copy(address)} />
          <Button label={t('receive.share')} variant="ghost" onPress={() => void Share.share({ message: address }).catch(() => undefined)} />
        </>
      }
    >
      {title}
      <View style={{ paddingVertical: th.primitive.space[2] }}>
        <QrCode value={address} label={t('receive.qrLabel')} />
      </View>
      <View style={{ gap: th.semantic.layout.fieldGap }}>
        <Text variant="bodySmall" color={th.semantic.text.tertiary}>{t('receive.addressLabel')}</Text>
        <AddressText address={address} size="L" />
        <Text variant="caption" color={th.semantic.text.tertiary}>{t('receive.warning')}</Text>
      </View>
      <PushOptInSheet visible={open} onClose={() => setOpen(false)} />
    </Screen>
  )
}
