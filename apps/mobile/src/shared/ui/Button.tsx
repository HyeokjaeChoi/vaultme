// Figma: Button Primary 9:283 / Secondary 9:284 / Ghost 9:285
import { Pressable, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated'
import { useTheme } from '../theme'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

const PRESS_SCALE = 0.97 // DESIGN motion rule; no token yet

type Props = {
  label: string
  onPress?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  busy?: boolean
  icon?: IconName
  style?: StyleProp<ViewStyle>
}

/**
 * C01 Button. Visual control = min-height by size, paddingX by size, radius/colors per variant, gap fieldGap.
 * Label is Product / Label (14/20 semibold) at every size, as drawn in Figma. Label wraps to 2 lines; height grows, never clips.
 * With an icon: icon at the leading edge, label centered in the remaining space (Figma "Optional action icon").
 */
export function Button({ label, onPress, variant = 'primary', size = 'lg', disabled, busy, icon, style }: Props) {
  const t = useTheme()
  const b = t.component.button
  const v = b[variant]
  const reduce = useReducedMotion()
  const scale = useSharedValue(1)
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  const [x1, y1, x2, y2] = t.primitive.motion.easing.standard
  const press = (to: number) => {
    if (!reduce) scale.value = withTiming(to, { duration: t.primitive.motion.duration.fastMs, easing: Easing.bezier(x1, y1, x2, y2) })
  }
  const blocked = disabled || busy
  const fg = blocked ? v.fg.disabled : v.fg.default
  const leading: IconName | undefined = busy ? 'loading' : icon
  const iconColor = blocked ? v.fg.disabled : variant === 'primary' ? t.component.icon.action.onPrimary : t.component.icon.action.fg
  return (
    <Animated.View style={[anim, { minWidth: b.hitTarget }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!blocked, busy: !!busy }}
        onPress={blocked ? undefined : onPress}
        onPressIn={() => !blocked && press(PRESS_SCALE)}
        onPressOut={() => press(1)}
        style={({ pressed }) => ({
          minHeight: b.size[size].height,
          paddingHorizontal: b.size[size].paddingX,
          borderRadius: v.radius,
          borderWidth: v.borderWidth,
          borderColor: variant === 'secondary' ? b.secondary.border : v.bg.default,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: t.semantic.layout.fieldGap,
          backgroundColor: blocked ? v.bg.disabled : pressed ? v.bg.pressed : v.bg.default,
        })}
      >
        {leading ? <Icon name={leading} size={busy ? t.component.icon.size.inline : t.component.icon.size.control} color={iconColor} /> : null}
        <Text variant="label" numberOfLines={2} color={fg} style={{ textAlign: 'center', flex: 1 }}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  )
}
