// Figma: Activity row 36:48 (inside Date list 342:833; Icon / action / send 137:6, receive 137:24; status icons 137:58 / 137:75 / 137:110 / 137:127)
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Icon } from './Icon'
import { Text } from './Text'

export type ActivityStatus = 'pending' | 'confirmed' | 'failed' | 'unknown'
type Props = { title: string; detail?: string; time: string; amount: string; kind: 'send' | 'receive'; status: ActivityStatus; statusLabel: string }

/** C10 Activity row. Flat (no fill, paddingX 0; rows sit in one white <Group> per date). Identity + values on top, result line below. Status is always an icon plus words, never color alone. */
export function ActivityRow({ title, detail, time, amount, kind, status, statusLabel }: Props) {
  const t = useTheme()
  const c = t.component.activityRow
  const gap = t.semantic.layout.fieldGap
  return (
    <View
      accessible
      focusable={false} // Android: no grey keyboard-focus highlight on a read-only row
      accessibilityLabel={`${title}, ${time}, ${amount}, ${statusLabel}`}
      style={{ minHeight: c.minHeight, gap, paddingVertical: c.list.paddingY }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.semantic.layout.rowGap }}>
        <View style={{ width: t.primitive.space[6], height: t.primitive.space[6], borderRadius: t.semantic.shape.control, backgroundColor: t.semantic.surface.subtle, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={kind} size={t.component.icon.size.control} color={t.component.icon.action.fg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="row" color={c.title}>{title}</Text>
          {detail ? <Text variant="address" color={t.semantic.text.secondary}>{detail}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
          <Text variant="row" color={c.amount} style={{ textAlign: 'right' }}>{amount}</Text>
          <Text variant="body" color={t.semantic.text.secondary} style={{ textAlign: 'right' }}>{time}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap }}>
        <Icon name={status} size={t.component.icon.size.control} color={c[status]} />
        <Text variant="body" color={c[status]} style={{ flex: 1 }}>{statusLabel}</Text>
      </View>
    </View>
  )
}
