// Figma: Activity row 36:48 (Date list 342:833); Redesign B: B/Row 418:12824 Leading=Asset badge (Title, Subtitle, Value) with B/Row badge 495:358; State=Caution 877:631 (Caution line, Kind=Warning 877:483)
import { Pressable, View } from 'react-native'
import { useTheme } from '../theme'
import { AssetIcon } from './AssetIcon'
import { activityRowLook } from './activityRowLook'
import { RowBadge } from './RowBadge'
import { Text } from './Text'

export type ActivityStatus = 'pending' | 'confirmed' | 'failed' | 'unknown' | 'replaced'
type Props = {
  title: string
  detail?: string
  time: string
  amount: string
  kind: 'send' | 'receive'
  asset: string
  status: ActivityStatus
  statusLabel: string
  /** State=Caution (Q71): the caution line under the subtitle, with a warning badge. Set for an incoming zero-value transfer. */
  caution?: string
  /** Makes the row a button (opens the detail). */ onPress?: () => void
}

const SIGN = /^[+\-−]/

/**
 * C10 Row with asset badge. Flat, min-height rowB.height 64, 40 pt asset logo with a status badge, title (Row title 500) + subtitle (Caption tertiary), amount (Headline, tabular).
 * Badge = sent / received (confirmed), pending, failed, unknown, replaced. Amount: received in Ink with "+" (accent rule), pending and unknown in text/secondary, failed (no sign) and replaced (sign kept) struck through in text/tertiary.
 * State=Caution adds the caution line (Caption, badge/warning/fg), the warning badge, and padding top and bottom space/3 (the row grows). Title carries the status words; subtitle is "{자산 이름} · {시각}". Status is never color alone.
 */
export function ActivityRow({
  title,
  detail,
  time,
  amount,
  kind,
  asset,
  status,
  statusLabel,
  caution,
  onPress,
}: Props) {
  const t = useTheme()
  const c = t.component.activityRow
  const look = activityRowLook({ status, kind, caution: !!caution })
  const struck = look.struck
  const color =
    look.amountTone === 'tertiary'
      ? t.semantic.text.tertiary
      : look.amountTone === 'secondary'
        ? t.semantic.text.secondary
        : c.amount
  const label = `${title}, ${time}, ${amount}, ${statusLabel}${caution ? `, ${caution}` : ''}`
  const row = (
    <View
      {...(onPress ? {} : { accessible: true, accessibilityLabel: label })}
      style={{
        minHeight: t.component.rowB.height,
        ...(look.showCaution ? { paddingVertical: t.primitive.space[3] } : {}),
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.semantic.layout.rowGap,
      }}
    >
      <View style={{ width: t.primitive.size.avatar_md, height: t.primitive.size.avatar_md }}>
        <AssetIcon symbol={asset === 'USDC' ? 'USDC' : 'ETH'} size={t.primitive.size.avatar_md} />
        <View
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            transform: [{ translateX: t.component.rowBadge.ring }, { translateY: t.component.rowBadge.ring }],
          }}
        >
          <RowBadge kind={look.badge} />
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="rowTitle" color={c.title}>
          {title}
        </Text>
        <Text variant="caption" color={t.semantic.text.tertiary}>
          {detail ?? time}
        </Text>
        {look.showCaution ? (
          <Text variant="caption" color={t.component.badge.warning.fg}>
            {caution}
          </Text>
        ) : null}
      </View>
      <Text
        variant="headline"
        tabular
        color={color}
        style={{
          textAlign: 'right',
          flexShrink: 1,
          ...(struck ? { textDecorationLine: 'line-through' as const } : {}),
        }}
      >
        {status === 'failed' ? amount.replace(SIGN, '') : amount}
      </Text>
    </View>
  )
  return onPress ? (
    <Pressable accessible accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      {row}
    </Pressable>
  ) : (
    row
  )
}
