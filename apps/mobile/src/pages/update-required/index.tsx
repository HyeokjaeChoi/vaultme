import { useEffect } from 'react'
import { BackHandler, Linking, Platform, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/shared/theme'
import { Button, Icon, Screen, Text } from '@/shared/ui'

// TODO(release): VaultMe has no store listing yet. Put the real App Store id and Play package page here before the first store build.
const STORE_URL = Platform.select({
  ios: 'https://apps.apple.com/app/vaultme/id0000000000',
  default: 'https://play.google.com/store/apps/details?id=app.vaultme.mobile',
})

/** R-S91 앱 업데이트 필요 (API said 426). Replaces the whole app: no back, no tabs, one button. Figma C3-S91 377:2528. */
export function UpdateRequiredPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const mark = th.primitive.space[10] + th.primitive.space[8] // 72
  useEffect(() => {
    // Android back must not reveal the blocked app underneath.
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true)
    return () => sub.remove()
  }, [])
  return (
    <Screen footer={<Button label={t('updateRequired.cta')} onPress={() => void Linking.openURL(STORE_URL)} />}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: th.semantic.layout.sectionGap.product }}>
        {/* ponytail: Figma mark icon is 30 px; nearest token is icon_xl (32). Same mark as S90. */}
        <View style={{ width: mark, height: mark, borderRadius: th.primitive.radius.xl, backgroundColor: th.semantic.brand.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="backup" size={th.primitive.size.icon_xl} color={th.semantic.text.onBrand} />
        </View>
        <Text variant="display" accessibilityRole="header" style={{ textAlign: 'center' }}>{t('updateRequired.title')}</Text>
        <Text variant="body" color={th.semantic.text.secondary} style={{ textAlign: 'center' }}>{t('updateRequired.body')}</Text>
      </View>
    </Screen>
  )
}
