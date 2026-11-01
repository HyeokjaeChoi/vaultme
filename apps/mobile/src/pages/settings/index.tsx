// Figma: B-S60 Settings 423:13797 (full 515:45343, dark 515:45681): Title, B/Account block 515:27571, Section bands, Blocks 보안 / 알림 / 정보 with B/Settings row 426:2045 (Solar Linear leading icon)
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Pressable, View } from 'react-native'
import { account, networkFact } from '@/entities/account'
import { useAccountAddress } from '@/features/backup'
import { usePushSetting, useZeroSetting } from '@/features/settings'
import { shortAddress } from '@/shared/lib/address'
import { testCrashEnabled, triggerTestCrash } from '@/shared/lib/sentry'
import { useCopy } from '@/shared/lib/useCopy'
import { useTheme } from '@/shared/theme'
import { AccountBlock, Block, ListItem, Screen, SectionBand, TabHeader } from '@/shared/ui'
import { NetworkChips } from '@/widgets/network-chips'

/** B-S60 설정: account block with copy, then grouped rows (보안 / 알림 / 정보) on Section bands, each row with a Solar icon. */
export function SettingsPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const [push] = usePushSetting()
  const [zero] = useZeroSetting()
  const stored = useAccountAddress()
  const address = stored ?? (__DEV__ ? account.address : null) // the fixture address only fills __DEV__ captures; never offer it to copy
  const { copied, copy } = useCopy(t('settings.copied'))
  const pad = th.semantic.layout.screen.padding
  const tight = th.primitive.space[1]
  const version = (
    <ListItem
      icon="info"
      iconColor={th.component.icon.status.info}
      title={t('settings.version')}
      factValue
      trailing={{ kind: 'value', text: `v${Constants.expoConfig?.version ?? ''}` }}
    />
  )
  return (
    <Screen edges={['top']} bleed gap="none" topGap="none">
      <View style={{ paddingHorizontal: pad }}>
        <TabHeader title={t('settings.title')} chips={<NetworkChips />} />
      </View>
      <View style={{ paddingHorizontal: pad, paddingVertical: th.semantic.layout.groupGap }}>
        <AccountBlock
          name={account.name}
          {...(address ? { address: shortAddress(address) } : {})}
          copyLabel={copied ? t('settings.copied') : t('asset.copy')}
          copied={copied}
          onCopy={() => stored && void copy(stored)}
        />
      </View>
      <SectionBand />
      <Block title={t('settings.group.security')} gap={tight}>
        <ListItem
          icon="key"
          title={t('settings.phrase')}
          trailing={{ kind: 'disclosure' }}
          onPress={() => router.push('/settings/phrase')}
        />
        {/* The Figma value "확인됨" is left out: root/jailbreak detection is not built, so the app cannot claim the device was checked. */}
        <ListItem
          icon="deviceWarning"
          title={t('settings.device')}
          trailing={{ kind: 'disclosure' }}
          onPress={() => router.push('/settings/device')}
        />
      </Block>
      <SectionBand />
      <Block title={t('settings.group.notify')} gap={tight}>
        <ListItem
          icon="bell"
          title={t('settings.push')}
          trailing={{ kind: 'disclosure', text: push ? t('settings.on') : t('settings.off') }}
          onPress={() => router.push('/settings/push')}
        />
        <ListItem
          icon="eye"
          title={t('settings.zero')}
          trailing={{ kind: 'disclosure', text: zero ? t('settings.shown') : t('settings.hidden') }}
          onPress={() => router.push('/settings/zero')}
        />
      </Block>
      <SectionBand />
      <Block title={t('settings.group.info')} gap={tight}>
        <ListItem
          icon="network"
          title={t('settings.network')}
          factValue
          trailing={{ kind: 'value', text: networkFact }}
        />
        <ListItem
          icon="document"
          title={t('settings.licenses')}
          trailing={{ kind: 'disclosure' }}
          onPress={() => router.push('/settings/licenses')}
        />
        {/* Hidden test action (Q50): a long press on the version row sends a test error and crashes the app. Only in a dev build or staging; no visible change. */}
        {testCrashEnabled() ? (
          <Pressable onLongPress={() => void triggerTestCrash()} delayLongPress={1500} accessible={false}>
            {version}
          </Pressable>
        ) : (
          version
        )}
      </Block>
    </Screen>
  )
}
export { DeviceWarningPage } from './device'
export { LicensePage } from './license'
export { LicensesPage } from './licenses'
export { PushSettingPage } from './push'
export { ZeroSettingPage } from './zero'
