// Figma: Activity row 36:48 (Icon / action / send 137:6, receive 137:24; status icons 137:58 / 137:75 / 137:110 / 137:127)
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Icon } from './Icon'
import { Text } from './Text'

export type ActivityStatus = 'pending' | 'confirmed' | 'failed' | 'unknown'
type Props = { title: string; detail?: string; time: string; amount: string; kind: 'send' | 'receive'; status: ActivityStatus; statusLabel: string }

/** C10 Activity row. Identity + values on top, result line below. Status is always an icon plus words, never color alone. */
export function ActivityRow({ title, detail, time, amount, kind, status, statusLabel }: Props) {
  const t = useTheme()
  const c = t.component.activityRow
  const gap = t.semantic.layout.fieldGap
  return (
    <View
      accessible
      accessibilityLabel={`${title}, ${time}, ${amount}, ${statusLabel}`}
      style={{ minHeight: c.minHeight, gap, paddingVertical: t.semantic.layout.rowGap, backgroundColor: c.bg }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.semantic.layout.rowGap }}>
        <View style={{ width: t.primitive.size.avatar_sm, height: t.primitive.size.avatar_sm, borderRadius: t.semantic.shape.control, backgroundColor: t.semantic.surface.subtle, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={kind} size={t.component.icon.size.control} color={t.component.icon.action.fg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="row" color={c.title}>{title}</Text>
          {detail ? <Text variant="body" color={c.meta}>{detail}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
          <Text variant="row" color={c.amount} style={{ textAlign: 'right' }}>{amount}</Text>
          <Text variant="body" color={c.meta} style={{ textAlign: 'right' }}>{time}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap }}>
        <Icon name={status} size={t.component.icon.size.control} color={c[status]} />
        <Text variant="body" color={c[status]} style={{ flex: 1 }}>{statusLabel}</Text>
      </View>
    </View>
  )
}
