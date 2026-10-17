// Figma: Button Primary 9:283 / Secondary 9:284 / Ghost 9:285 (Redesign B restyle: pill, 56 / 48 / 40)
import { Pressable, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated'
import { useTheme } from '../theme'
import { usePressScale, useSpin } from '../theme/motion'
import { useOnRaised } from '../theme/sheet'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

const COPIED_FADE_MS = 150 // Figma Copied contract: 150 ms crossfade (no token for motion yet)

type Props = {
  label: string
  onPress?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  busy?: boolean
  /** Secondary whose action cannot be undone: danger-colored label (risk sheets, clear test data). Never Primary. */
  danger?: boolean
  icon?: IconName
  /** Progressive label shown while busy under Reduce Motion (the spinner does not rotate): "보내는 중…". */
  busyLabel?: string
  /** State=Copied (Figma 555:64682, 555:68322, 555:68334): check icon in place of the icon; the caller passes the "복사했어요" label. Content fades in over 150 ms (no fade under Reduce Motion). */
  copied?: boolean
  style?: StyleProp<ViewStyle>
}

/**
 * C01 Button (Redesign B). Pill, height buttonB.height lg/md/sm (56/48/40), paddingX buttonB.paddingX, label Headline 17/600.
 * Primary = buttonB.primary, Secondary = buttonB.secondary (neutral), Ghost = white with Ink label. Label wraps to 2 lines; height grows, never clips.
 * Small (40) = the Copy pill: Label 14/500 and a 16 pt icon (Figma 515:27579).
 * With an icon: icon at the leading edge, label centered in the remaining space (Figma "Optional action icon").
 * The control is at least hitTarget (44) tall: a small visual control sits inside it and extends its touch area with hitSlop.
 * Busy: the icon is the loading glyph (3/4 ring), rotating 800 ms linear. Under Reduce Motion it is static and the label switches to `busyLabel`.
 * Press feedback: scale 0.97, 100 ms ease-out (off under Reduce Motion), plus the pressed color.
 */
export function Button({ label, onPress, variant = 'primary', size = 'lg', disabled, busy, danger, icon, busyLabel, copied, style }: Props) {
  const t = useTheme()
  const reduce = useReducedMotion()
  const onRaised = useOnRaised()
  const b = t.component.button
  const bb = t.component.buttonB
  const { style: anim, handlers } = usePressScale()
  const spin = useSpin(!!busy)
  const height = bb.height[size]
  const slop = Math.max(0, (b.hitTarget - height) / 2)
  const blocked = disabled || busy
  const sec = onRaised ? bb.secondary.bgOnRaised : bb.secondary.bg
  // Disabled (Figma): surface/disabled fill + text/disabled label, for every variant.
  const disabledBg = bb.primary.bgDisabled
  const bg =
    variant === 'primary'
      ? blocked ? disabledBg : { default: bb.primary.bg, pressed: b.primary.bg.pressed }
      : variant === 'secondary'
        ? blocked ? disabledBg : { default: sec, pressed: onRaised ? t.semantic.surface.pressedOnRaised : bb.secondary.bgPressed }
        : blocked ? b.ghost.bg.disabled : { default: b.ghost.bg.default, pressed: b.ghost.bg.pressed }
  const fgDefault = variant === 'primary' ? bb.primary.fg : danger ? t.semantic.status.danger.fg : variant === 'secondary' ? bb.secondary.fg : t.semantic.text.primary
  const fg = blocked ? bb.primary.fgDisabled : fgDefault
  const leading: IconName | undefined = busy ? 'loading' : copied ? 'check' : icon
  const shownLabel = busy && reduce && busyLabel ? busyLabel : label
  const iconColor = blocked ? fg : variant === 'primary' ? t.component.icon.action.onPrimary : t.component.icon.action.fg
  return (
    <Animated.View style={[anim, { minWidth: b.hitTarget, minHeight: b.hitTarget, justifyContent: 'center' }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={shownLabel}
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
        <Animated.View
          key={copied ? 'copied' : 'rest'}
          {...(copied && !reduce ? { entering: FadeIn.duration(COPIED_FADE_MS) } : {})}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.semantic.layout.fieldGap, flexShrink: 1 }}
        >
          {leading ? (
            <Animated.View style={busy ? spin : undefined}>
              <Icon name={leading} size={busy || size === 'sm' ? t.component.icon.size.inline : t.component.icon.size.control} color={iconColor} />
            </Animated.View>
          ) : null}
          <Text variant={size === 'sm' ? 'label' : 'headline'} numberOfLines={2} color={fg} style={{ textAlign: 'center', flexShrink: 1 }}>
            {shownLabel}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  )
}
