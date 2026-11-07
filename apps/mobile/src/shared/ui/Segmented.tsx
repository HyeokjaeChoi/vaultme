// Figma: Segmented control 300:622
import { Pressable, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { useSelectionTravel, useTheme } from '../theme'
import { Text } from './Text'

type Props<T extends string> = { options: readonly { value: T; label: string }[]; value: T; onChange: (v: T) => void }

/** C30 Segmented control. Two exclusive choices; selection state (color, label, checked) changes at once, the filled pill (surface.segmentSelected) travels to the new segment over fastMs and stretches up to 12% (Reduce Motion: it jumps). Track subtle, pill inset in the track, no stroke. Segment 36 high inside the 44 track; hitSlop restores the 44 target. */
export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  const t = useTheme()
  const pad = t.primitive.space[1]
  const half = t.primitive.space['0_5'] // half of `pad`: the pill slot carries half the gap on each side so one slot = one segment + one gap
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )
  const travel = useSelectionTravel(index, 'self')
  return (
    <View
      accessibilityRole="radiogroup"
      style={{
        flexDirection: 'row',
        gap: pad,
        padding: pad,
        borderRadius: t.component.segmented.radius,
        backgroundColor: t.component.segmented.bg,
      }}
    >
      {/* The pill sits behind the labels. Slot 0 holds it; `%` travel of that slot moves it one segment + one gap per step. */}
      <View
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          top: pad,
          bottom: pad,
          left: half,
          right: half,
          flexDirection: 'row',
        }}
      >
        <Animated.View style={[{ flex: 1, paddingHorizontal: half }, travel]}>
          <View
            style={{
              flex: 1,
              borderRadius: t.component.segmented.radius,
              backgroundColor: t.component.segmented.selectedBg,
            }}
          />
        </Animated.View>
        {options.slice(1).map((o) => (
          <View key={o.value} style={{ flex: 1 }} />
        ))}
      </View>
      {options.map((o) => {
        const on = o.value === value
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(o.value)}
            hitSlop={{ top: pad, bottom: pad }}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: t.primitive.space[2],
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: t.component.segmented.radius,
              backgroundColor: !on && pressed ? t.semantic.surface.pressed : 'transparent', // the pill shows through
            })}
          >
            <Text variant="label" color={on ? t.component.segmented.selectedFg : t.component.segmented.fg}>
              {o.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
