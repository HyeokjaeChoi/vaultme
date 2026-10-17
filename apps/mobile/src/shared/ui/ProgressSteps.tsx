// Figma: B/Progress steps 494:1176 (Step=Sent / Included / Confirmed)
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

export type ProgressState = 'Pending' | 'Included' | 'Confirmed'
type Props = { state: ProgressState; labels: [string, string, string] }

/**
 * Send progress 보냄 -> 블록 포함 -> 확정. Done = filled success dot, current = warning ring, future = border ring.
 * A line segment is success-colored when the step on its right is done. Real network state only: never for Unknown, Replaced, Failed or a test send.
 */
export function ProgressSteps({ state, labels }: Props) {
  const t = useTheme()
  const dot = t.primitive.size.icon_xs
  const ring = t.primitive.borderWidth.strong
  const s = t.semantic.status
  const phase = (['done', state === 'Pending' ? 'current' : 'done', state === 'Confirmed' ? 'done' : state === 'Pending' ? 'future' : 'current'] as const)
  const accessibilityLabel = labels.join(', ') // the hero text says the state in words
  const seg = (right: (typeof phase)[number]) => ({ flex: 1, height: ring, backgroundColor: right === 'done' ? s.success.fg : t.semantic.border.subtle })
  const align = ['flex-start', 'center', 'flex-end'] as const
  return (
    <View accessible accessibilityLabel={accessibilityLabel} accessibilityRole="progressbar" style={{ gap: t.semantic.layout.fieldGap }}>
      <View>
        <View style={{ position: 'absolute', left: dot / 2, right: dot / 2, top: (dot - ring) / 2, flexDirection: 'row' }}>
          <View style={seg(phase[1])} />
          <View style={seg(phase[2])} />
        </View>
        <View style={{ flexDirection: 'row' }}>
          {phase.map((p, i) => (
            <View key={i} style={{ flex: 1, alignItems: align[i] }}>
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
            </View>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {labels.map((l, i) => (
          <View key={l} style={{ flex: 1, alignItems: align[i] }}>
            <Text variant="label" color={phase[i] === 'current' ? s.warning.fg : phase[i] === 'future' ? t.semantic.text.tertiary : t.semantic.text.primary}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
