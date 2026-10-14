// Figma: Button Primary 9:283 / Secondary 9:284 / Ghost 9:285
import { Pressable, type StyleProp, type ViewStyle } from 'react-native'
import Animated from 'react-native-reanimated'
import { useTheme } from '../theme'
import { usePressScale } from '../theme/motion'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

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
 * The control is at least hitTarget (44) tall: a small visual control sits inside it and extends its touch area with hitSlop.
 * Press feedback: scale 0.97, 160 ms ease-out (off under Reduce Motion).
 */
export function Button({ label, onPress, variant = 'primary', size = 'lg', disabled, busy, icon, style }: Props) {
  const t = useTheme()
  const b = t.component.button
  const v = b[variant]
  const { style: anim, handlers } = usePressScale()
  const slop = Math.max(0, (b.hitTarget - b.size[size].height) / 2)
  const blocked = disabled || busy
  const fg = blocked ? v.fg.disabled : v.fg.default
  const leading: IconName | undefined = busy ? 'loading' : icon
  const iconColor = blocked ? v.fg.disabled : variant === 'primary' ? t.component.icon.action.onPrimary : t.component.icon.action.fg
  return (
    <Animated.View style={[anim, { minWidth: b.hitTarget, minHeight: b.hitTarget, justifyContent: 'center' }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!blocked, busy: !!busy }}
        onPress={blocked ? undefined : onPress}
        hitSlop={{ top: slop, bottom: slop }}
        onPressIn={() => !blocked && handlers.onPressIn()}
        onPressOut={handlers.onPressOut}
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
