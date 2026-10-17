// Figma: Product navigation 67:342 (Navigation / Assets 85:598, Activity 85:602, Settings 85:606)
import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme'
import { Icon, type BoldIconName } from './Icon'
import { Text } from './Text'

export type NavItem = { key: string; label: string; icon: BoldIconName; active: boolean; onPress: () => void }

/** C21 Product navigation (tab bar). Full screen width, bar fill extends into the bottom safe area, 1 px top border, space-2 top padding, icon over Label text; active = Solar Bold icon (icon.navigation.activeFg) + brand-colored label, inactive = Linear icon. */
export function ProductNavigation({ items }: { items: NavItem[] }) {
  const t = useTheme()
  const nav = t.component.productNavigation
  const insets = useSafeAreaInsets()
  return (
    <View style={{ backgroundColor: nav.bg, paddingBottom: Math.max(insets.bottom, t.primitive.space[2]) }}>
      <View
        accessibilityRole="tablist"
        style={{
          minHeight: nav.height,
          flexDirection: 'row',
          gap: t.semantic.layout.fieldGap,
          paddingTop: t.primitive.space[2],
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
              {i.active ? (
                <Icon name={i.icon} weight="bold" size={t.component.icon.size.feature} color={nav.active} />
              ) : (
                <Icon name={i.icon as 'assets'} size={t.component.icon.size.feature} color={t.component.icon.navigation.fg} />
              )}
              <Text variant="label" color={color} maxFontSizeMultiplier={1.3} style={{ textAlign: 'center' }}>{i.label}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
