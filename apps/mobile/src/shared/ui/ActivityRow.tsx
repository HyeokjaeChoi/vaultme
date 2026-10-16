// Figma: Activity row 36:48 (inside Date list 342:833; Icon / action / send 137:6, receive 137:24; status icons 137:58 / 137:75 / 137:110 / 137:127); Redesign B: B/Row
import { Pressable, View } from 'react-native'
import { useTheme } from '../theme'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

export type ActivityStatus = 'pending' | 'confirmed' | 'failed' | 'unknown'
type Props = { title: string; detail?: string; time: string; amount: string; kind: 'send' | 'receive'; status: ActivityStatus; statusLabel: string; /** Makes the row a button (opens the detail). */ onPress?: () => void }

const SIGN = /^[+\-−]/

/**
 * C10 Activity row (Redesign B row). Flat, min-height rowB.height 64, 40 circle icon, title (Headline) + subtitle (Caption tertiary), amount (Headline, tabular).
 * Pending: clock icon. Unknown: question icon. Failed: amount has no sign and is struck through in text/tertiary.
 * Title carries the status words ("보내는 중", "보내기 실패"); subtitle is "{자산} · {시각}" (`detail`, else `time`) only. Status is never color alone.
 */
export function ActivityRow({ title, detail, time, amount, kind, status, statusLabel, onPress }: Props) {
  const t = useTheme()
  const c = t.component.activityRow
  const failed = status === 'failed'
  const icon: IconName = status === 'pending' ? 'pending' : status === 'unknown' ? 'unknown' : kind
  const subtitle = detail ?? time
  const row = (
    <View
      accessible
      accessibilityLabel={`${title}, ${time}, ${amount}, ${statusLabel}`}
      style={{ minHeight: t.component.rowB.height, flexDirection: 'row', alignItems: 'center', gap: t.semantic.layout.rowGap }}
    >
      <View style={{ width: t.primitive.size.avatar_md, height: t.primitive.size.avatar_md, borderRadius: t.primitive.radius.pill, backgroundColor: t.semantic.surface.subtle, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={t.component.icon.size.control} color={t.component.icon.action.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="headline" color={c.title}>{title}</Text>
        <Text variant="caption" color={t.semantic.text.tertiary}>{subtitle}</Text>
      </View>
      <Text
        variant="headline"
        tabular
        color={failed ? t.semantic.text.tertiary : c.amount}
        style={{ textAlign: 'right', flexShrink: 1, ...(failed ? { textDecorationLine: 'line-through' as const } : {}) }}
      >
        {failed ? amount.replace(SIGN, '') : amount}
      </Text>
    </View>
  )
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress}>{row}</Pressable>
  ) : (
    row
  )
}
