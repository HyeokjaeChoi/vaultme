// Figma: B-S40 Title 471:5175 / B-S60 Title (58 high, left Title 1, right one chip); Home uses the same height in ProductHeader 515:42217
import type { ReactNode } from 'react'
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

/** Tab header height: Title 1 line (34) + space-3 above and below = 58, shared by Home, Activity and Settings. */
export function useTabHeaderHeight() {
  const t = useTheme()
  return t.primitive.type.productB.title1.lineHeight + t.primitive.space[3] * 2
}

/** Activity and Settings header: Title 1 at the left, one honesty chip at the right, 58 high, vertically centered. The screen pads left and right (16). */
export function TabHeader({ title, chips }: { title: string; chips?: ReactNode }) {
  const t = useTheme()
  return (
    <View style={{ minHeight: useTabHeaderHeight(), flexDirection: 'row', alignItems: 'center', gap: t.semantic.layout.fieldGap }}>
      <Text variant="title1" accessibilityRole="header" style={{ flex: 1 }}>{title}</Text>
      {chips ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.primitive.space['1_5'] }}>{chips}</View> : null}
    </View>
  )
}
