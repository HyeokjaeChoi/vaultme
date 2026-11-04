// Figma: Switch 300:611
import { Pressable } from 'react-native'
import Animated, { useReducedMotion } from 'react-native-reanimated'
import { EASE_OUT_CSS, useTheme } from '../theme'

type Props = { value: boolean; onValueChange: (v: boolean) => void; label: string; disabled?: boolean }

// Figma C29 is 51x31 with no Foundation size tokens yet. Nearest: control_lg 52 x avatar_sm 32 (1 px larger). Colors and radius use component.switch.*.
export function Switch({ value, onValueChange, label, disabled }: Props) {
  const t = useTheme()
  const reduce = useReducedMotion()
  const ms = t.primitive.motion.duration.fastMs
  const w = t.primitive.size.control_lg
  const h = t.primitive.size.avatar_sm
  const pad = t.primitive.space['0_5']
  const thumb = h - pad * 2
  const slop = {
    top: (t.primitive.size.touch_min - h) / 2,
    bottom: (t.primitive.size.touch_min - h) / 2,
    left: 0,
    right: 0,
  }
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      hitSlop={slop}
      style={{ justifyContent: 'center', opacity: disabled ? t.primitive.opacity[40] : t.primitive.opacity[100] }}
    >
      {/* Motion audit M4: the thumb travels and the colors ease over fastMs. Reduce Motion: the thumb jumps, the colors still ease. */}
      <Animated.View
        style={{
          width: w,
          height: h,
          borderRadius: t.component.switch.radius,
          padding: pad,
          backgroundColor: value ? t.component.switch.track.on : t.component.switch.track.off,
          transitionProperty: 'backgroundColor',
          transitionDuration: ms,
          transitionTimingFunction: EASE_OUT_CSS,
        }}
      >
        <Animated.View
          style={{
            width: thumb,
            height: thumb,
            borderRadius: t.component.switch.radius,
            transform: [{ translateX: value ? w - thumb - pad * 2 : 0 }],
            backgroundColor: disabled && !value ? t.semantic.text.disabled : t.component.switch.thumb, // Off/Disabled thumb (Figma 300:610): light reads dimmed too
            transitionProperty: ['transform', 'backgroundColor'],
            transitionDuration: [reduce ? 0 : ms, ms],
            transitionTimingFunction: EASE_OUT_CSS,
          }}
        />
      </Animated.View>
    </Pressable>
  )
}
