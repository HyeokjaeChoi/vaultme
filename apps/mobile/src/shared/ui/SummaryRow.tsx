// Figma: Summary row 330:10480 (Format=Text 330:10465, Address 330:10470, Total 330:10475); Redesign B: B/Detail row 399:123 (Text), 399:126 (Address), 403:162 (Text emphasis, optional sub value 419:554)
import { Pressable, View, useWindowDimensions } from 'react-native'
import { useTheme } from '../theme'
import { AddressText } from './AddressBlock'
import { Text } from './Text'

type Props = {
  label: string
  value: string
  /** `text` = label left, value right (Body). `address` = label above, full mono address below in 4-char groups, wraps. `total` = emphasis: Headline value. */
  format?: 'text' | 'address' | 'total'
  /** Caption line under the value (right aligned), e.g. "최대 0.050063 ETH". */
  sub?: string
  /** Marks the 4-char groups of an `address` value that differ (look-alike check). */
  highlight?: number[]
  /** Value as a Fact (Product B/Fact, IBM Plex Mono 12, text/secondary): network + chainId, block, time. Facts are mono, feelings and explanations are sans. */
  fact?: boolean
  /** `address` only: one color, no strong ends, 14/20 (B/Detail row Address, emphasis Off: S11 contract address). */
  plain?: boolean
  editLabel?: string
  /** Overrides the edit link's accessibilityLabel (default: `${editLabel} ${label}`). */
  editAccessibilityLabel?: string
  onEdit?: () => void
}

/** C35 Summary row (Redesign B detail row, center aligned): label Body Small tertiary, value Body right; address stacks under its label. Flat, no divider: group rows in <Group>. */
export function SummaryRow({
  label,
  value,
  format = 'text',
  sub,
  highlight,
  fact,
  plain,
  editLabel,
  editAccessibilityLabel,
  onEdit,
}: Props) {
  const t = useTheme()
  const labelWidth = t.primitive.space[10] * 4 // Figma label column 160
  const total = format === 'total'
  const address = format === 'address'
  // At about 150% text and above the label sits above the value, so a long amount keeps the full row width.
  const { fontScale } = useWindowDimensions()
  const stacked = address || fontScale >= 1.5
  const edit = onEdit ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={editAccessibilityLabel ?? `${editLabel ?? ''} ${label}`.trim()}
      onPress={onEdit}
      style={{
        minWidth: t.primitive.size.touch_min,
        minHeight: t.primitive.size.touch_min,
        alignSelf: address || stacked ? 'flex-start' : 'stretch',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: t.primitive.space[2],
      }}
    >
      <Text variant="link" color={t.semantic.text.link}>
        {editLabel}
      </Text>
    </Pressable>
  ) : null
  return (
    <View
      accessible={!onEdit}
      accessibilityLabel={onEdit ? undefined : `${label}, ${value}${sub ? `, ${sub}` : ''}`}
      style={{
        flexDirection: stacked ? 'column' : 'row',
        alignItems: stacked ? 'stretch' : 'center',
        gap: address ? t.primitive.space[1] : t.semantic.layout.groupGap,
        minHeight: t.primitive.size.touch_min,
        paddingVertical: t.primitive.space[3],
      }}
    >
      <Text variant="bodySmall" color={t.semantic.text.tertiary} style={stacked ? undefined : { width: labelWidth }}>
        {label}
      </Text>
      {address ? (
        <AddressText
          address={value}
          highlight={highlight ?? []}
          {...(plain
            ? {
                size: fact ? ('F' as const) : ('S' as const),
                emphasis: false,
                color: fact ? t.semantic.text.secondary : t.semantic.text.primary,
              }
            : {})}
        />
      ) : (
        <View style={stacked ? undefined : { flex: 1, alignItems: 'flex-end' }}>
          <Text
            variant={total ? 'headline' : fact ? 'fact' : 'body'}
            tabular
            {...(fact ? { color: t.semantic.text.secondary } : {})}
            style={{ textAlign: stacked ? 'left' : 'right' }}
          >
            {value}
          </Text>
          {sub ? (
            <Text
              variant="caption"
              tabular
              color={t.semantic.text.tertiary}
              style={{ textAlign: stacked ? 'left' : 'right' }}
            >
              {sub}
            </Text>
          ) : null}
        </View>
      )}
      {edit}
    </View>
  )
}
