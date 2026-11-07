// Figma: Switch 300:611
import { Pressable, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { useSelectionTravel, useTheme } from '../theme'

type Props = { value: boolean; onValueChange: (v: boolean) => void; label: string; disabled?: boolean }

// Figma C29 is 51x31 with no Foundation size tokens yet. Nearest: control_lg 52 x avatar_sm 32 (1 px larger). Colors and radius use component.switch.*.
export function Switch({ value, onValueChange, label, disabled }: Props) {
  const t = useTheme()
  const w = t.primitive.size.control_lg
  const h = t.primitive.size.avatar_sm
  const pad = t.primitive.space['0_5']
  const thumb = h - pad * 2
  const travel = useSelectionTravel(value ? 1 : 0, w - thumb - pad * 2)
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
      style={({ pressed }) => ({
        justifyContent: 'center',
        opacity: disabled ? t.primitive.opacity[40] : pressed ? t.primitive.opacity[72] : t.primitive.opacity[100],
      })}
    >
      {/* Selection motion (DESIGN.md Motion, Figma 300:611 note): the thumb travels and stretches up to 12% over fastMs; the track color and `checked` change at once. Reduce Motion: the thumb jumps, no stretch. */}
      <View
        style={{
          width: w,
          height: h,
          borderRadius: t.component.switch.radius,
          padding: pad,
          backgroundColor: value ? t.component.switch.track.on : t.component.switch.track.off,
        }}
      >
        <Animated.View style={travel}>
          <View
            style={{
              width: thumb,
              height: thumb,
              borderRadius: t.component.switch.radius,
              backgroundColor: disabled && !value ? t.semantic.text.disabled : t.component.switch.thumb, // Off/Disabled thumb (Figma 300:610): light reads dimmed too
            }}
          />
        </Animated.View>
      </View>
    </Pressable>
  )
}
