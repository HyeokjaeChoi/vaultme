// Figma: B/Chip 421:812 (State Default / Selected / Disabled)
import { Pressable } from 'react-native'
import Animated from 'react-native-reanimated'
import { useTheme } from '../theme'
import { usePressScale } from '../theme/motion'
import { Text } from './Text'

type Props = { label: string; selected?: boolean; disabled?: boolean; onPress?: () => void }

/** Amount chip (25% / 50% / 전액). Pill, height buttonB.height.sm 40 with a 44 pt touch area, Label text. Selected = inverse fill. */
export function Chip({ label, selected, disabled, onPress }: Props) {
  const t = useTheme()
  const { style, handlers } = usePressScale()
  const slop = Math.max(0, (t.primitive.size.touch_min - t.component.buttonB.height.sm) / 2)
  const bg = disabled ? t.semantic.surface.subtle : selected ? t.semantic.surface.inverse : t.semantic.surface.pressed
  const fg = disabled ? t.semantic.text.disabled : selected ? t.semantic.text.inverse : t.semantic.text.primary
  return (
    <Animated.View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: !!selected, disabled: !!disabled }}
        disabled={disabled}
        onPress={onPress}
        hitSlop={{ top: slop, bottom: slop }}
        {...handlers}
        style={{ height: t.component.buttonB.height.sm, paddingHorizontal: t.primitive.space[4], borderRadius: t.component.buttonB.radius, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}
      >
        <Text variant="label" color={fg}>{label}</Text>
      </Pressable>
    </Animated.View>
  )
}
