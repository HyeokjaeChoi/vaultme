import { useEffect } from 'react'
import { BackHandler, Linking, Platform, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/shared/theme'
import { Button, Screen, Text } from '@/shared/ui'

// TODO(release): VaultMe has no store listing yet. Put the real App Store id and Play package page here before the first store build.
const STORE_URL = Platform.select({
  ios: 'https://apps.apple.com/app/vaultme/id0000000000',
  default: 'https://play.google.com/store/apps/details?id=app.vaultme.mobile',
})

/** B-S91 앱 업데이트 필요 (API said 426). Replaces the whole app: no back, no tabs, one button. Figma 423:15443. */
export function UpdateRequiredPage() {
  const { t } = useTranslation()
  const th = useTheme()
  useEffect(() => {
    // Android back must not reveal the blocked app underneath.
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true)
    return () => sub.remove()
  }, [])
  return (
    <Screen footer={<Button label={t('updateRequired.cta')} onPress={() => void Linking.openURL(STORE_URL)} />}>
      <View style={{ flex: 1, justifyContent: 'center', gap: th.semantic.layout.fieldGap }}>
        <Text variant="title1" accessibilityRole="header">{t('updateRequired.title')}</Text>
        <Text variant="body" color={th.semantic.text.secondary}>{t('updateRequired.body')}</Text>
      </View>
    </Screen>
  )
}
