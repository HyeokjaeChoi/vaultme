import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/shared/theme'
import { SkeletonRow, Text } from '@/shared/ui'

/** The S40 loading body; S41 shows it too while it looks a bare hash up (Figma 749:2651). */
export function Loading() {
  const { t } = useTranslation()
  const th = useTheme()
  return (
    <View accessibilityLiveRegion="polite">
      <Text variant="bodySmall" color={th.semantic.text.secondary} style={{ paddingVertical: th.primitive.space[2] }}>
        {t('activity.loading')}
      </Text>
      {Array.from({ length: 6 }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  )
}
