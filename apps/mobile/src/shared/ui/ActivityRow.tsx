// Figma: Activity row 36:48 (Date list 342:833); Redesign B: B/Row Leading=Asset badge (Title, Subtitle, Value) with B/Row badge 495:358
import { Pressable, View } from 'react-native'
import { useTheme } from '../theme'
import { AssetIcon } from './AssetIcon'
import { RowBadge, type RowBadgeKind } from './RowBadge'
import { Text } from './Text'

export type ActivityStatus = 'pending' | 'confirmed' | 'failed' | 'unknown' | 'replaced'
type Props = { title: string; detail?: string; time: string; amount: string; kind: 'send' | 'receive'; asset: string; status: ActivityStatus; statusLabel: string; /** Makes the row a button (opens the detail). */ onPress?: () => void }

const SIGN = /^[+\-−]/

/**
 * C10 Row with asset badge. Flat, min-height rowB.height 64, 40 pt asset logo with a status badge, title (Row title 500) + subtitle (Caption tertiary), amount (Headline, tabular).
 * Badge = sent / received (confirmed), pending, failed, unknown, replaced. Amount: received in Ink with "+" (accent rule), pending and unknown in text/secondary, failed (no sign) and replaced (sign kept) struck through in text/tertiary.
 * Title carries the status words; subtitle is "{자산 이름} · {시각}". Status is never color alone.
 */
export function ActivityRow({ title, detail, time, amount, kind, asset, status, statusLabel, onPress }: Props) {
  const t = useTheme()
  const c = t.component.activityRow
  const struck = status === 'failed' || status === 'replaced'
  const badge: RowBadgeKind = status === 'confirmed' ? (kind === 'send' ? 'sent' : 'received') : status
  const color = struck ? t.semantic.text.tertiary : status === 'pending' || status === 'unknown' ? t.semantic.text.secondary : c.amount
  const row = (
    <View
      accessible
      accessibilityLabel={`${title}, ${time}, ${amount}, ${statusLabel}`}
      style={{ minHeight: t.component.rowB.height, flexDirection: 'row', alignItems: 'center', gap: t.semantic.layout.rowGap }}
    >
      <View style={{ width: t.primitive.size.avatar_md, height: t.primitive.size.avatar_md }}>
        <AssetIcon symbol={asset === 'USDC' ? 'USDC' : 'ETH'} size={t.primitive.size.avatar_md} />
        <View style={{ position: 'absolute', right: 0, bottom: 0, transform: [{ translateX: t.component.rowBadge.ring }, { translateY: t.component.rowBadge.ring }] }}>
          <RowBadge kind={badge} />
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="rowTitle" color={c.title}>{title}</Text>
        <Text variant="caption" color={t.semantic.text.tertiary}>{detail ?? time}</Text>
      </View>
      <Text variant="headline" tabular color={color} style={{ textAlign: 'right', flexShrink: 1, ...(struck ? { textDecorationLine: 'line-through' as const } : {}) }}>
        {status === 'failed' ? amount.replace(SIGN, '') : amount}
      </Text>
    </View>
  )
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress}>{row}</Pressable> : row
}
