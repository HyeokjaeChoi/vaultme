// Figma: Product navigation 67:342 (Navigation / Assets 85:598, Activity 85:602, Settings 85:606)
import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

export type NavItem = { key: string; label: string; icon: IconName; active: boolean; onPress: () => void }

/** C21 Product navigation (tab bar). White bar inset by screen padding, 1 px top border, icon over Label text; active = brand color. */
export function ProductNavigation({ items }: { items: NavItem[] }) {
  const t = useTheme()
  const nav = t.component.productNavigation
  const insets = useSafeAreaInsets()
  return (
    <View style={{ backgroundColor: t.semantic.surface.canvas, paddingHorizontal: t.semantic.layout.screen.padding, paddingBottom: Math.max(insets.bottom, t.primitive.space[2]) }}>
      <View
        accessibilityRole="tablist"
        style={{
          height: nav.height,
          flexDirection: 'row',
          gap: t.semantic.layout.fieldGap,
          backgroundColor: nav.bg,
          borderTopWidth: nav.borderWidth,
          borderTopColor: nav.border,
        }}
      >
        {items.map((i) => {
          const color = i.active ? nav.active : nav.default
          return (
            <Pressable
              key={i.key}
              accessibilityRole="tab"
              accessibilityLabel={i.label}
              accessibilityState={{ selected: i.active }}
              onPress={i.onPress}
              style={{ flex: 1, minHeight: t.primitive.size.touch_min, alignItems: 'center', gap: t.semantic.layout.fieldGap, borderWidth: nav.itemBorderWidth }}
            >
              <Icon name={i.icon} size={t.component.icon.size.control} color={color} />
              <Text variant="label" color={color} style={{ textAlign: 'center' }}>{i.label}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
