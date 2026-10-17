// Figma: B-S31 backup required (423:13750)
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { goBack } from '@/shared/lib/nav'
import { Button, EmptyState, Screen, ScreenHeader, Text } from '@/shared/ui'
import { NetworkChips } from '@/widgets/network-chips/NetworkChips'

/**
 * B-S31 "backup first" screen. Not routed since Q14 (receive is open before backup).
 * TODO(figma): Figma repurposes S31 as the send backup gate / deposit sheet; then wire it into `SendGuard` (features/backup/ui) and delete this copy.
 */
export function BackupRequired() {
  const { t } = useTranslation()
  const router = useRouter()
  return (
    <Screen
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack()} chips={<NetworkChips />} />}
      footer={
        <>
          <Button label={t('home.backupCta')} onPress={() => router.push('/backup')} />
          <Button label={t('common.later')} variant="ghost" onPress={() => goBack()} />
        </>
      }
    >
      <Text variant="title1" accessibilityRole="header">{t('receive.title')}</Text>
      <EmptyState icon="deviceWarning" tone="warning" title={t('receive.backup.title')} body={t('receive.backup.body')} />
    </Screen>
  )
}
