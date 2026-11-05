// Figma: B/Progress steps 494:1176 (Step=Sent / Included / Confirmed)
import { View } from 'react-native'
import Animated, { useReducedMotion } from 'react-native-reanimated'
import { EASE_OUT_CSS, useTheme } from '../theme'
import { Text } from './Text'

export type ProgressState = 'Pending' | 'Included' | 'Confirmed'
type Props = { state: ProgressState; labels: [string, string, string] }

/**
 * Send progress 보냄 -> 블록 포함 -> 확정. Done = filled success dot, current = warning ring, future = border ring.
 * A line is success-colored when the step on its right is done. A change of state eases the dot and line colors over baseMs (motion audit M3; Reduce Motion: at once); labels never animate. Three equal columns, dot and label centered. Real network state only: never for Unknown, Replaced, Failed or a test send.
 */
export function ProgressSteps({ state, labels }: Props) {
  const t = useTheme()
  const dot = t.primitive.size.icon_xs
  const ring = t.primitive.borderWidth.strong
  const s = t.semantic.status
  const reduce = useReducedMotion()
  const colorEase = {
    transitionProperty: ['backgroundColor', 'borderColor'],
    transitionDuration: reduce ? 0 : t.primitive.motion.duration.baseMs,
    transitionTimingFunction: EASE_OUT_CSS,
  } as const
  const phase = [
    'done',
    state === 'Pending' ? 'current' : 'done',
    state === 'Confirmed' ? 'done' : state === 'Pending' ? 'future' : 'current',
  ] as const
  const accessibilityLabel = labels.join(', ') // the hero text says the state in words
  // Each of the 3 equal columns holds [left line][dot][right line] with the label centered under the dot; the two outer lines are transparent (Figma 494:1176).
  const seg = (right: (typeof phase)[number] | null) => ({
    flex: 1,
    height: ring,
    backgroundColor: right === null ? 'transparent' : right === 'done' ? s.success.fg : t.semantic.border.subtle,
    ...colorEase,
  })
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: phase.length, now: phase.filter((p) => p === 'done').length }}
      style={{ flexDirection: 'row' }}
    >
      {phase.map((p, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: t.semantic.layout.fieldGap }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' }}>
            <Animated.View style={seg(i === 0 ? null : p)} />
            <Animated.View
              style={{
                width: dot,
                height: dot,
                borderRadius: t.primitive.radius.pill,
                borderWidth: ring, // done keeps the ring in the fill color: same box as no ring, so only colors change
                borderColor: p === 'done' ? s.success.fg : p === 'current' ? s.warning.fg : t.semantic.border.subtle,
                backgroundColor: p === 'done' ? s.success.fg : t.semantic.surface.default,
                ...colorEase,
              }}
            />
            <Animated.View style={seg(i === 2 ? null : (phase[i + 1] ?? null))} />
          </View>
          <Text
            variant="label"
            color={p === 'current' ? s.warning.fg : p === 'future' ? t.semantic.text.tertiary : t.semantic.text.primary}
          >
            {labels[i]}
          </Text>
        </View>
      ))}
    </View>
  )
}
