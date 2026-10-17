import { Redirect } from 'expo-router'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { account } from '@/entities/account/fixtures'
import { useAccountAddress } from '@/features/backup'
import { View } from 'react-native'
import { useCopy } from '@/shared/lib/useCopy'
import { useTheme } from '@/shared/theme'
import { Button, Screen, StatusNotice, SummaryRow, Text } from '@/shared/ui'

/**
 * B-S06 복구 완료 (Figma 423:13703): title, first-account address (Detail row, Address kind), info notice; 주소 복사 + 지갑 열기 in the footer. The wallet's own first-account address in full (4-char groups, copy), and the note that only the first account was loaded (Q40).
 * The address is read from kv (derived at restore); with none the screen redirects to Start. `demo` (__DEV__ `?demo=1`) shows the fixture address for design capture.
 * Backup is not claimed anywhere here (Q16).
 */
export function RestoreDonePage({ demo = false }: { demo?: boolean }) {
  const { t } = useTranslation()
  const router = useRouter()
  const th = useTheme()
  const stored = useAccountAddress()
  const { copied, copy } = useCopy(t('restore.done.copied'))
  const address = stored ?? (demo ? account.address : null)
  if (!address) return <Redirect href="/" />
  return (
    <Screen
      gap="section"
      footer={
        <View style={{ gap: th.semantic.layout.fieldGap }}>
          <Button label={copied ? t('restore.done.copied') : t('receive.copy')} variant="secondary" copied={copied} onPress={() => void copy(address)} />
          <Button label={t('restore.open')} onPress={() => router.replace('/home')} />
        </View>
      }
    >
      <Text variant="title1" accessibilityRole="header" style={{ paddingTop: th.primitive.space[4] }}>{t('restore.done.title')}</Text>
      <SummaryRow format="address" label={t('restore.done.addressLabel')} value={address} />
      <StatusNotice tone="info" title={t('restore.done.noteTitle')} body={t('restore.done.noteBody')} />
    </Screen>
  )
}
