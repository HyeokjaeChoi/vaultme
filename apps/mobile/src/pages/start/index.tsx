import { useRouter } from 'expo-router'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/shared/theme'
import { Button, Icon, Screen, Text } from '@/shared/ui'

/** R-S01 시작 */
export function StartPage() {
  const { t } = useTranslation()
  const th = useTheme()
  const router = useRouter()
  const mark = th.primitive.space[10] + th.primitive.space[8] // 72
  return (
    <Screen
      footer={
        <View style={{ gap: th.semantic.layout.fieldGap }}>
          <Button label={t('start.create')} onPress={() => router.push('/precheck')} />
          <Button label={t('start.restore')} variant="secondary" onPress={() => router.replace({ pathname: '/home', params: { variant: 'restored' } })} />
        </View>
      }
    >
      <View style={{ flex: 1, justifyContent: 'center', gap: th.semantic.layout.sectionGap.product }}>
        {/* ponytail: Figma mark icon is 30 px; nearest token is icon_xl (32). */}
        <View style={{ width: mark, height: mark, borderRadius: th.primitive.radius.xl, backgroundColor: th.semantic.brand.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="backup" size={th.primitive.size.icon_xl} color={th.semantic.text.onBrand} />
        </View>
        <Text variant="display" accessibilityRole="header">{t('start.title')}</Text>
        <Text variant="body" color={th.semantic.text.secondary}>{t('start.body')}</Text>
      </View>
    </Screen>
  )
}
