import { Redirect, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { useAccountAddress } from '@/features/backup'
import { clearHeld, restoredWithPassphrase } from '@/features/restore/model/handoff'
import { removeRestoredWallet } from '@/features/restore/model/restoreWallet'
import { View } from 'react-native'
import { useCopy } from '@/shared/lib/useCopy'
import { useTheme } from '@/shared/theme'
import { Button, Screen, StatusNotice, SummaryRow, Text } from '@/shared/ui'

/**
 * B-S06 복구 완료 (Figma 423:13703): title, first-account address (Detail row, Address kind), info notice; 주소 복사 is an inline Ghost button under the address (Figma 2026-10-17); the footer has 다른 주소예요 (Secondary) and 지갑 열기 (Primary). The wallet's own first-account address in full (4-char groups, copy), and the note that only the first account was loaded (Q40).
 * The address is read from kv (derived at restore); with none the screen redirects to Start. `demo` (__DEV__ `?demo=1`) shows the fixture address for design capture.
 * Backup is not claimed anywhere here.
 */
// Public Trezor test vector: the demo address of the passphrase state (allowed by scripts/check-repo-rules.sh R10).
const DEMO_PASSPHRASE_ADDRESS = '0x9c32F71D4DB8Fb9e1A58B0a80dF79935e7256FA6'

export function RestoreDonePage({
  demo = false,
  copiedDemo = false,
  passphraseDemo = false,
}: {
  demo?: boolean
  copiedDemo?: boolean
  passphraseDemo?: boolean
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const th = useTheme()
  const stored = useAccountAddress()
  const { copied, copy } = useCopy(t('restore.done.copied'), copiedDemo)
  const [withPassphrase] = useState(() => passphraseDemo || restoredWithPassphrase())
  const [removing, setRemoving] = useState(false)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') clearHeld() // the words held for "다른 주소예요" do not outlive the app being in the foreground
    })
    return () => sub.remove()
  }, [])
  const address = stored ?? (demo ? (passphraseDemo ? DEMO_PASSPHRASE_ADDRESS : account.address) : null)
  const different = async () => {
    setRemoving(true)
    // Wrong wallet: remove it, go back to S05. The words stay (in memory, via the hand-off), the passphrase does not.
    if (await removeRestoredWallet()) router.replace('/restore')
    else setRemoving(false)
  }
  if (!address) return <Redirect href="/" />
  return (
    <Screen
      gap="section"
      footer={
        <View style={{ gap: th.semantic.layout.fieldGap }}>
          <Button
            label={t('restore.done.different')}
            variant="secondary"
            disabled={removing}
            onPress={() => void different()}
          />
          <Button
            label={t('restore.open')}
            disabled={removing}
            onPress={() => {
              clearHeld()
              router.replace('/home')
            }}
          />
        </View>
      }
    >
      <View style={{ gap: th.semantic.layout.fieldGap, paddingTop: th.primitive.space[4] }}>
        <Text variant="title1" accessibilityRole="header">
          {t('restore.done.title')}
        </Text>
        {withPassphrase ? (
          <Text variant="body" color={th.semantic.text.secondary}>
            {t('restore.done.withPassphrase')}
          </Text>
        ) : null}
      </View>
      <SummaryRow format="address" plain label={t('restore.done.addressLabel')} value={address} />
      <Button
        size="sm"
        variant="ghost"
        link
        label={copied ? t('restore.done.copied') : t('receive.copy')}
        copied={copied}
        onPress={() => void copy(address)}
        style={{ alignSelf: 'flex-start' }}
      />
      <StatusNotice tone="info" title={t('restore.done.noteTitle')} body={t('restore.done.noteBody')} />
    </Screen>
  )
}
