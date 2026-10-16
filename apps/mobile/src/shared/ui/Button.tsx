// Figma: Button Primary 9:283 / Secondary 9:284 / Ghost 9:285 (Redesign B restyle: pill, 56 / 48 / 40)
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
 * C01 Button (Redesign B). Pill, height buttonB.height lg/md/sm (56/48/40), paddingX buttonB.paddingX, label Headline 17/600.
 * Primary = buttonB.primary, Secondary = buttonB.secondary (neutral), Ghost = white with Ink label. Label wraps to 2 lines; height grows, never clips.
 * With an icon: icon at the leading edge, label centered in the remaining space (Figma "Optional action icon").
 * The control is at least hitTarget (44) tall: a small visual control sits inside it and extends its touch area with hitSlop.
 * Press feedback: scale 0.97, 100 ms ease-out (off under Reduce Motion), plus the pressed color.
 */
export function Button({ label, onPress, variant = 'primary', size = 'lg', disabled, busy, icon, style }: Props) {
  const t = useTheme()
  const b = t.component.button
  const bb = t.component.buttonB
  const { style: anim, handlers } = usePressScale()
  const height = bb.height[size]
  const slop = Math.max(0, (b.hitTarget - height) / 2)
  const blocked = disabled || busy
  const bg =
    variant === 'primary'
      ? blocked ? bb.primary.bgDisabled : { default: bb.primary.bg, pressed: b.primary.bg.pressed }
      : variant === 'secondary'
        ? blocked ? b.secondary.bg.disabled : { default: bb.secondary.bg, pressed: bb.secondary.bgPressed }
        : blocked ? b.ghost.bg.disabled : { default: b.ghost.bg.default, pressed: b.ghost.bg.pressed }
  const fgDefault = variant === 'primary' ? bb.primary.fg : variant === 'secondary' ? bb.secondary.fg : t.semantic.text.primary
  const fg = blocked ? b[variant].fg.disabled : fgDefault
  const leading: IconName | undefined = busy ? 'loading' : icon
  const iconColor = blocked ? fg : variant === 'primary' ? t.component.icon.action.onPrimary : t.component.icon.action.fg
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
          minHeight: height,
          paddingHorizontal: bb.paddingX[size],
          borderRadius: bb.radius,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: t.semantic.layout.fieldGap,
          backgroundColor: typeof bg === 'string' ? bg : pressed ? bg.pressed : bg.default,
        })}
      >
        {leading ? <Icon name={leading} size={busy ? t.component.icon.size.inline : t.component.icon.size.control} color={iconColor} /> : null}
        <Text variant="headline" numberOfLines={2} color={fg} style={{ textAlign: 'center', flexShrink: 1 }}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  )
}
