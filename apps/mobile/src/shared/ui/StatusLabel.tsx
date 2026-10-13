// Figma: Status label 67:241
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

type State = 'confirmed' | 'warning' | 'failed' | 'info' | 'unknown' | 'pending'
const MAP: Record<State, { icon: IconName; tone: 'success' | 'warning' | 'danger' | 'info' | 'unknown' }> = {
  confirmed: { icon: 'confirmed', tone: 'success' },
  warning: { icon: 'warning', tone: 'warning' },
  failed: { icon: 'failed', tone: 'danger' },
  info: { icon: 'info', tone: 'info' },
  unknown: { icon: 'unknown', tone: 'unknown' },
  pending: { icon: 'pending', tone: 'warning' },
}

/** C04 Status label: fixed state icon + word on a tint pill. Confirmed is completion evidence, not a safety check. */
export function StatusLabel({ state, label }: { state: State; label: string }) {
  const t = useTheme()
  const b = t.component.badge
  const c = b[MAP[state].tone]
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{
        alignSelf: 'flex-start',
        minHeight: t.primitive.size.touch_min,
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.semantic.layout.fieldGap,
        paddingHorizontal: b.paddingX,
        paddingVertical: b.paddingY,
        borderRadius: b.radius,
        backgroundColor: c.bg,
      }}
    >
      <Icon name={MAP[state].icon} size={t.component.icon.size.control} color={c.fg} />
      <Text variant="label" color={c.fg}>{label}</Text>
    </View>
  )
}
