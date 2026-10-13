import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Button, Screen, ScreenHeader, StatusNotice } from '@/shared/ui'

/** S02 시작 전에 확인 */
export function PrecheckPage() {
  const { t } = useTranslation()
  const router = useRouter()
  return (
    <Screen footer={<Button label={t('precheck.cta')} onPress={() => router.replace('/home')} />}>
      <ScreenHeader title={t('precheck.title')} backLabel={t('common.back')} onBack={() => router.back()} />
      <StatusNotice tone="warning" title={t('precheck.lose.title')} body={t('precheck.lose.body')} />
      <StatusNotice tone="info" title={t('precheck.scam.title')} body={t('precheck.scam.body')} />
      <StatusNotice tone="info" title={t('precheck.testnet.title')} body={t('precheck.testnet.body')} />
    </Screen>
  )
}
