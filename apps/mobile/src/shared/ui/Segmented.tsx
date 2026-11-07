// Figma: Segmented control 300:622
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { useSelectionTravel, useTheme } from '../theme'
import { Text } from './Text'

type Props<T extends string> = { options: readonly { value: T; label: string }[]; value: T; onChange: (v: T) => void }

/** C30 Segmented control. Two exclusive choices; selection state (color, label, checked) changes at once, the filled pill (surface.segmentSelected) travels to the new segment over fastMs and stretches up to 12% (Reduce Motion: it jumps). Track subtle, pill inset in the track, no stroke. Segment 36 high inside the 44 track; hitSlop restores the 44 target. */
export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  const t = useTheme()
  const pad = t.primitive.space[1]
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )
  // Segment x and width come from layout (the segments share the row equally), so the pill matches them exactly. Before the first layout the selected segment paints the pill itself.
  const [lay, setLay] = useState<{ x: number; w: number }[]>([])
  const first = lay[0]
  const second = lay[1]
  const seg =
    first && (options.length < 2 || second) ? { x: first.x, w: first.w, step: second ? second.x - first.x : 0 } : null
  const travel = useSelectionTravel(index, seg?.step ?? 0)
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
      {/* The pill sits behind the labels and travels to the selected segment. */}
      {seg ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              pointerEvents: 'none',
              top: pad,
              bottom: pad,
              left: seg.x,
              width: seg.w,
              borderRadius: t.component.segmented.radius,
              backgroundColor: t.component.segmented.selectedBg,
            },
            travel,
          ]}
        />
      ) : null}
      {options.map((o, i) => {
        const on = o.value === value
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(o.value)}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout
              setLay((l) => Object.assign([...l], { [i]: { x, w: width } }))
            }}
            hitSlop={{ top: pad, bottom: pad }}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: t.primitive.space[2],
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: t.component.segmented.radius,
              backgroundColor:
                !seg && on
                  ? t.component.segmented.selectedBg
                  : !on && pressed
                    ? t.semantic.surface.pressed
                    : 'transparent', // the pill shows through once measured
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
