import * as Clipboard from 'expo-clipboard'
import { Redirect } from 'expo-router'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { useAccountAddress } from '@/features/backup'
import { AddressBlock, Button, Screen, StatusNotice, Text } from '@/shared/ui'

/**
 * R-S06 복구 완료. The wallet's own first-account address in full (4-char groups, copy), and the note that only the first account was loaded (Q40).
 * The address is read from kv (derived at restore); with none the screen redirects to Start. `demo` (__DEV__ `?demo=1`) shows the fixture address for design capture.
 * Backup is not claimed anywhere here (Q16).
 */
export function RestoreDonePage({ demo = false }: { demo?: boolean }) {
  const { t } = useTranslation()
  const router = useRouter()
  const stored = useAccountAddress()
  const [copied, setCopied] = useState(false)
  const address = stored ?? (demo ? account.address : null)
  if (!address) return <Redirect href="/" />
  return (
    <Screen footer={<Button label={t('restore.open')} onPress={() => router.replace('/home')} />}>
      <Text variant="title" accessibilityRole="header">{t('restore.done.title')}</Text>
      <AddressBlock
        address={address}
        label={t('restore.done.addressLabel')}
        copyLabel={copied ? t('restore.done.copied') : t('receive.copy')}
        onCopy={() => void Clipboard.setStringAsync(address).then(() => setCopied(true))}
      />
      <StatusNotice tone="warning" title={t('restore.done.noteTitle')} body={t('restore.done.noteBody')} />
    </Screen>
  )
}
