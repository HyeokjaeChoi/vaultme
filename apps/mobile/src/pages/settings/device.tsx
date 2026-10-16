// Figma: B-S92 루팅·탈옥 경고 423:15474
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { goBack } from '@/shared/lib/nav'
import { useTheme } from '@/shared/theme'
import { Button, Screen, StatusNotice, Text } from '@/shared/ui'

/** B-S92 기기 보안 경고. Opens from the S60 row; the root/jailbreak detection that would raise it on its own is not built. */
export function DeviceWarningPage() {
  const { t } = useTranslation()
  const th = useTheme()
  return (
    <Screen gap="section" footer={<Button label={t('settings.deviceScreen.cta')} onPress={() => goBack('/settings')} />}>
      <View style={{ flex: 1, justifyContent: 'center', gap: th.semantic.layout.sectionGap.product }}>
        <View style={{ gap: th.semantic.layout.fieldGap }}>
          <Text variant="title1" accessibilityRole="header">{t('settings.deviceScreen.title')}</Text>
          <Text variant="body" color={th.semantic.text.secondary}>{t('settings.deviceScreen.body')}</Text>
        </View>
        <StatusNotice tone="warning" title={t('settings.deviceScreen.noticeTitle')} body={t('settings.deviceScreen.noticeBody')} />
      </View>
    </Screen>
  )
}
