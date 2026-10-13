// Figma: Summary row 330:10480 (Format=Text 330:10465, Address 330:10470, Total 330:10475)
import { Pressable, View, useWindowDimensions } from 'react-native'
import { useTheme } from '../theme'
import { AddressText } from './AddressBlock'
import { Text } from './Text'

type Props = {
  label: string
  value: string
  /** `text` = value right (Row 16/500). `address` = full mono address, left, wraps. `total` = semibold label and value. */
  format?: 'text' | 'address' | 'total'
  /** Marks the 4-char groups of an `address` value that differ (look-alike check). */
  highlight?: number[]
  /** Text value in Product / Address (mono), e.g. a shortened address. */
  mono?: boolean
  editLabel?: string
  onEdit?: () => void
}

/** C35 Summary row: label, value, optional trailing link (44 pt target). Flat and without a divider: group rows in <Group>. */
export function SummaryRow({ label, value, format = 'text', highlight, mono, editLabel, onEdit }: Props) {
  const t = useTheme()
  const labelWidth = t.primitive.space[10] + t.primitive.space[8] // 72
  const total = format === 'total'
  // At about 150% text and above the label sits above the value, so a long address or amount keeps the full row width.
  const stacked = useWindowDimensions().fontScale >= 1.5
  return (
    <View
      accessible={!onEdit}
      accessibilityLabel={onEdit ? undefined : `${label}, ${value}`}
      style={{ flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'stretch' : 'flex-start', gap: t.semantic.layout.rowGap, minHeight: t.primitive.size.touch_min, paddingVertical: t.primitive.space[3] }}
    >
      <Text variant={total ? 'label' : 'body'} color={total ? t.semantic.text.primary : t.semantic.text.secondary} style={stacked ? undefined : { minWidth: labelWidth }}>{label}</Text>
      <View style={stacked ? undefined : { flex: 1 }}>
        {format === 'address' ? (
          <AddressText address={value} highlight={highlight ?? []} markColor={t.semantic.status.warning.fg} />
        ) : (
          <Text variant={total ? 'section' : mono ? 'address' : 'row'} style={{ textAlign: stacked ? 'left' : 'right' }}>{value}</Text>
        )}
      </View>
      {onEdit ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${editLabel ?? ''} ${label}`.trim()}
          onPress={onEdit}
          style={{ minWidth: t.primitive.size.touch_min, minHeight: t.primitive.size.touch_min, alignSelf: stacked ? 'flex-start' : 'stretch', alignItems: 'center', justifyContent: 'center', paddingHorizontal: t.primitive.space[2] }}
        >
          <Text variant="label" color={t.semantic.text.link}>{editLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
