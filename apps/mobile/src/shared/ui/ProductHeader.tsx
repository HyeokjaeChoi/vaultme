// Figma: B-S10 Header 515:42217 (Account: Icon / account 137:41 + name Headline; Chips 515:42223 = B/Status chip 494:1067)
import type { ReactNode } from 'react'
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Icon } from './Icon'
import { Text } from './Text'
import { useTabHeaderHeight } from './TabHeader'

/** Home header: account icon + name on the left, the honesty chips on the right. 58 high (same as the Activity and Settings title row). */
export function ProductHeader({ title, chips }: { title: string; chips?: ReactNode }) {
  const t = useTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: t.semantic.layout.fieldGap,
        minHeight: useTabHeaderHeight(),
      }}
    >
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={title}
        style={{ flexDirection: 'row', alignItems: 'center', gap: t.semantic.layout.fieldGap, flexShrink: 1 }}
      >
        <Icon name="account" size={t.component.icon.account.size} color={t.component.icon.account.fg} />
        <Text variant="headline">{title}</Text>
      </View>
      {chips ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.primitive.space['1_5'] }}>{chips}</View>
      ) : null}
    </View>
  )
}
