// Figma: B-S66 데이터와 개인정보 871:1455 (dark 871:1493): Title 1, then three items (Headline + Body secondary)
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { goBack } from '@/shared/lib/nav'
import { useTheme } from '@/shared/theme'
import { Screen, ScreenHeader, Text } from '@/shared/ui'

const ITEMS = ['lookup', 'push', 'keys'] as const

/** B-S66 데이터와 개인정보: what reaches the VaultMe server (ADR-0007, #311). Read-only, no actions. */
export function PrivacyPage() {
  const { t } = useTranslation()
  const th = useTheme()
  return (
    <Screen gap="section" header={<ScreenHeader backLabel={t('common.back')} onBack={() => goBack('/settings')} />}>
      <Text variant="title1" accessibilityRole="header">
        {t('settings.privacyScreen.title')}
      </Text>
      {ITEMS.map((k) => (
        <View key={k} style={{ gap: th.semantic.layout.fieldGap }}>
          <Text variant="headline" accessibilityRole="header">
            {t(`settings.privacyScreen.${k}.title`)}
          </Text>
          <Text variant="body" color={th.semantic.text.secondary}>
            {t(`settings.privacyScreen.${k}.body`)}
          </Text>
        </View>
      ))}
    </Screen>
  )
}
