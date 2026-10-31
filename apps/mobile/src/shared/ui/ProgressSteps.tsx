// Figma: B/Progress steps 494:1176 (Step=Sent / Included / Confirmed)
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

type ProgressState = 'Pending' | 'Included' | 'Confirmed'
type Props = { state: ProgressState; labels: [string, string, string] }

/**
 * Send progress 보냄 -> 블록 포함 -> 확정. Done = filled success dot, current = warning ring, future = border ring.
 * A line is success-colored when the step on its right is done. Three equal columns, dot and label centered. Real network state only: never for Unknown, Replaced, Failed or a test send.
 */
export function ProgressSteps({ state, labels }: Props) {
  const t = useTheme()
  const dot = t.primitive.size.icon_xs
  const ring = t.primitive.borderWidth.strong
  const s = t.semantic.status
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
  })
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      style={{ flexDirection: 'row' }}
    >
      {phase.map((p, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: t.semantic.layout.fieldGap }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' }}>
            <View style={seg(i === 0 ? null : p)} />
            <View
              style={{
                width: dot,
                height: dot,
                borderRadius: t.primitive.radius.pill,
                borderWidth: p === 'done' ? 0 : ring,
                borderColor: p === 'current' ? s.warning.fg : t.semantic.border.subtle,
                backgroundColor: p === 'done' ? s.success.fg : t.semantic.surface.default,
              }}
            />
            <View style={seg(i === 2 ? null : (phase[i + 1] ?? null))} />
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
