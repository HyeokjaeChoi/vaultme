import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Button, Screen, ScreenHeader, StatusNotice, Text } from '@/shared/ui'

/** S02 시작 전에 확인 */
export function PrecheckPage() {
  const { t } = useTranslation()
  const router = useRouter()
  return (
    <Screen
      header={<ScreenHeader backLabel={t('common.back')} onBack={() => router.back()} />}
      footer={<Button label={t('precheck.cta')} onPress={() => router.replace('/home')} />}
    >
      <Text variant="title" accessibilityRole="header">{t('precheck.title')}</Text>
      <StatusNotice tone="warning" title={t('precheck.lose.title')} body={t('precheck.lose.body')} />
      <StatusNotice tone="info" title={t('precheck.scam.title')} body={t('precheck.scam.body')} />
      <StatusNotice tone="info" title={t('precheck.testnet.title')} body={t('precheck.testnet.body')} />
    </Screen>
  )
}
