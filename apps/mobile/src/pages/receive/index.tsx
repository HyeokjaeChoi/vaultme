// Figma: B-S30 받기 (423:14163, dark 423:15512), B-S31 backup required (423:13750)
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Share, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { account, networkFact } from '@/entities/account/fixtures'
import { useAccountAddress, useBackupGate } from '@/features/backup'
import { PushOptInSheet } from '@/features/push-optin/ui/PushOptInSheet'
import { getPushOptinShown, getPushSetting, setPushOptinShown } from '@/shared/storage'
import { goBack } from '@/shared/lib/nav'
import { useCopy } from '@/shared/lib/useCopy'
import { useTheme } from '@/shared/theme'
import { Button, Icon, QrCode, Screen, ScreenHeader, StatusNotice, Text } from '@/shared/ui'
import { AddressText } from '@/shared/ui/AddressBlock'
import { FaucetRow } from '@/widgets/faucet-row/FaucetRow'
import { NetworkChips } from '@/widgets/network-chips/NetworkChips'

/**
 * B-S30 받기. A real QR of the wallet's own address (decoded in CI against the address, test/qr-decode.test.ts), the full address (Address L, first and last group strong), a network caption.
 * Copy gives a light haptic and the Copied label (shared `useCopy`); the faucet row (테스트 ETH 받기, first block of the footer stack: faucet, copy, share) copies the address and opens QuickNode; share opens the OS share sheet with the address. `sheet=1` opens S50. After the first copy or share of the address S50 opens once (#67).
 * Q14: receive works before backup; until then a warning with a "백업하기" link stays under the title (Figma S30B 586:97529). The address is the wallet's own, derived at creation and kept in kv; without one the screen redirects to Start.
 * `backedUp=1` is a __DEV__-only design-capture override: it shows the fixture address and no warning (`0` shows the fixture address with the warning).
 */
export function ReceivePage() {
  const { t } = useTranslation()
  const th = useTheme()
  const { sheet, backedUp, copied: copiedParam } = useLocalSearchParams<{ sheet?: string; backedUp?: string; copied?: string }>()
  const [open, setOpen] = useState(sheet === '1')
  const { copied, copy } = useCopy(t('receive.copied'), __DEV__ && copiedParam === '1')
  // #67: the push opt-in is offered once, right after the first copy or share of the address (Figma 652:107697 shows it over the Copied state).
  const offerPush = () => {
    try {
      if (getPushOptinShown() || getPushSetting()) return
      setPushOptinShown(true)
      setOpen(true)
    } catch {
      // kv not open: no offer
    }
  }
  const router = useRouter()
  const gate = useBackupGate()
  const stored = useAccountAddress()
  const demo = __DEV__ && (backedUp === '1' || backedUp === '0')
  const address = stored ?? (demo ? account.address : null)
  if (!address) return <Redirect href="/" /> // no wallet on this install: never show a fixture address as the user's own
  const warn = !gate.backedUp && !(__DEV__ && backedUp === '1') // Q14: receive is open before the backup; the warning stays until it is done
  const header = <ScreenHeader backLabel={t('common.back')} onBack={() => goBack()} chips={<NetworkChips />} />
  const title = (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Text variant="title1" accessibilityRole="header">{t('receive.title')}</Text>
        <Text variant="factUpper" color={th.semantic.text.tertiary}>{networkFact.toUpperCase()}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.semantic.layout.fieldGap }}>
        <Icon name="account" size={th.component.icon.account.size} color={th.component.icon.account.fg} />
        <Text variant="bodySmall" color={th.semantic.text.secondary}>{t('receive.account')}</Text>
      </View>
    </View>
  )
  return (
    <Screen
      header={header}
      gap="none"
      {...(warn ? {} : { footerLead: <FaucetRow address={address} inFooter /> })} // the faucet row is for a backed-up wallet (S30B has none)
      footer={
        <>
          <Button label={copied ? t('receive.copied') : t('receive.copy')} copied={copied} onPress={() => void copy(address).then((ok) => ok && offerPush())} />
          <Button label={t('receive.share')} variant="ghost" onPress={() => void Share.share({ message: address }).then((r) => r.action === Share.sharedAction && offerPush(), () => undefined)} />
        </>
      }
    >
      {title}
      {warn ? <StatusNotice tone="warning" title={t('receive.backupWarn.title')} body={t('receive.backupWarn.body')} link={{ label: t('receive.backupWarn.link'), onPress: () => router.push('/backup') }} /> : null}
      <View style={{ paddingVertical: th.primitive.space[2] }}>
        <QrCode value={address} label={t('receive.qrLabel')} />
      </View>
      <View style={{ gap: th.semantic.layout.fieldGap }}>
        <Text variant="bodySmall" color={th.semantic.text.tertiary}>{t('receive.addressLabel')}</Text>
        <AddressText address={address} size="L" />
        <Text variant="bodySmall" color={th.semantic.text.primary}>{t('receive.warning')}</Text>
      </View>
      <PushOptInSheet visible={open} onClose={() => setOpen(false)} />
    </Screen>
  )
}
