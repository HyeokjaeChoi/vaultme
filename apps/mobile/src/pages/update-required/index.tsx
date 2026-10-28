// Figma: B-S91 앱 업데이트 필요 423:15443 (dark 430:16093): Brand block + one Primary button
import { useEffect } from 'react'
import { BackHandler, Linking, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import { BrandScreen, Button } from '@/shared/ui'

// TODO(release): VaultMe has no store listing yet. Put the real App Store id and Play package page here before the first store build.
const STORE_URL = Platform.select({
  ios: 'https://apps.apple.com/app/vaultme/id0000000000',
  default: 'https://play.google.com/store/apps/details?id=dev.stackline.vaultme',
})

/** B-S91 앱 업데이트 필요 (API said 426). Replaces the whole app: no back, no tabs, one button. */
export function UpdateRequiredPage() {
  const { t } = useTranslation()
  useEffect(() => {
    // Android back must not reveal the blocked app underneath.
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true)
    return () => sub.remove()
  }, [])
  return (
    <BrandScreen
      title={t('updateRequired.title')}
      body={t('updateRequired.body')}
      actions={<Button label={t('updateRequired.cta')} onPress={() => void Linking.openURL(STORE_URL)} />}
    />
  )
}
