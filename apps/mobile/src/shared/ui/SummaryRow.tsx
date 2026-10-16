// Figma: Summary row 330:10480 (Format=Text 330:10465, Address 330:10470, Total 330:10475); Redesign B: B/Detail row
import { Pressable, View, useWindowDimensions } from 'react-native'
import { useTheme } from '../theme'
import { AddressText } from './AddressBlock'
import { Text } from './Text'

type Props = {
  label: string
  value: string
  /** `text` = value right (Body 16). `address` = full mono address, left, wraps. `total` = Label label and Headline value. */
  format?: 'text' | 'address' | 'total'
  /** Marks the 4-char groups of an `address` value that differ (look-alike check). */
  highlight?: number[]
  /** Text value in Product / Address (mono), e.g. a shortened address. */
  mono?: boolean
  editLabel?: string
  /** Overrides the edit link's accessibilityLabel (default: `${editLabel} ${label}`). */
  editAccessibilityLabel?: string
  onEdit?: () => void
}

/** C35 Summary row (Redesign B detail row): label Body Small tertiary left, value right; address in mono 4-char groups. Label, value, optional trailing link (44 pt target). Flat and without a divider: group rows in <Group>. */
export function SummaryRow({ label, value, format = 'text', highlight, mono, editLabel, editAccessibilityLabel, onEdit }: Props) {
  const t = useTheme()
  const labelWidth = t.primitive.space[10] + t.primitive.space[8] // 72
  const total = format === 'total'
  // At about 150% text and above the label sits above the value, so a long address or amount keeps the full row width.
  const stacked = useWindowDimensions().fontScale >= 1.5
  return (
    <View
      accessible={!onEdit}
      accessibilityLabel={onEdit ? undefined : `${label}, ${value}`}
      style={{ flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'stretch' : format === 'address' ? 'flex-start' : 'center', gap: t.semantic.layout.rowGap, minHeight: t.primitive.size.touch_min, paddingVertical: t.primitive.space[3] }}
    >
      <Text variant={total ? 'label' : 'bodySmall'} color={total ? t.semantic.text.primary : t.semantic.text.tertiary} style={stacked ? undefined : { minWidth: labelWidth }}>{label}</Text>
      <View style={stacked ? undefined : { flex: 1 }}>
        {format === 'address' ? (
          <AddressText address={value} highlight={highlight ?? []} markColor={t.semantic.status.warning.fg} />
        ) : (
          <Text variant={total ? 'headline' : mono ? 'address' : 'body'} tabular style={{ textAlign: stacked ? 'left' : 'right' }}>{value}</Text>
        )}
      </View>
      {onEdit ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={editAccessibilityLabel ?? `${editLabel ?? ''} ${label}`.trim()}
          onPress={onEdit}
          style={{ minWidth: t.primitive.size.touch_min, minHeight: t.primitive.size.touch_min, alignSelf: stacked ? 'flex-start' : 'stretch', alignItems: 'center', justifyContent: 'center', paddingHorizontal: t.primitive.space[2] }}
        >
          <Text variant="label" color={t.semantic.text.link}>{editLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
