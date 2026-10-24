// Figma: B-S31 send gate "먼저 복구 구문을 백업하세요" (423:13750, dark 430:15617)
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { goBack } from '@/shared/lib/nav'
import { Button, EmptyState, Screen, ScreenHeader, Text } from '@/shared/ui'
import { NetworkChips } from '@/widgets/network-chips'

/**
 * B-S31 as the send gate (revised 2026-10-17): receiving is open before the backup, the first send needs it. Shown by `SendGuard` in place of the send flow.
 * Title "보내기", warning hero, one reason, Primary "백업 시작", Ghost "나중에" (back to where the user came from).
 */
export function BackupGate() {
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
      <Text variant="title1" accessibilityRole="header">
        {t('send.title')}
      </Text>
      <EmptyState
        icon="deviceWarning"
        tone="warning"
        title={t('send.backupGate.title')}
        body={t('send.backupGate.body')}
      />
    </Screen>
  )
}
