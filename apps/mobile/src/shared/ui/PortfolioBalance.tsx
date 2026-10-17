// Figma: Portfolio balance 68:180 (Quote=Unavailable 68:176); Redesign B: B/Balance hero
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

type Props = {
  label: string
  value: string
  /** Splits the figure: `value` is the number (Figure 44/700), `unit` the smaller, lighter unit (Figure unit 24/600), on one baseline. */
  unit?: string
  note: string
  /** The value is a "no value" message, not an amount: Title 2 in text/secondary instead of the Display L amount. A missing price is not zero. */
  unavailable?: boolean
}

/** C23 Portfolio balance (Redesign B balance hero). Flat, no fill: label (Label, secondary), value (Display L, tabular), note (Body Small, tertiary), padding top 24 / bottom 16 (Figma 399:98). Unavailable: value is Title 2 + text/secondary. */
export function PortfolioBalance({ label, value, unit, note, unavailable }: Props) {
  const t = useTheme()
  const c = t.component.portfolioBalance
  return (
    <View accessible accessibilityLabel={`${label}, ${value}${unit ? ` ${unit}` : ''}. ${note}`} style={{ gap: c.gap, paddingTop: t.primitive.space[6], paddingBottom: t.primitive.space[4] }}>
      <Text variant="label" color={t.semantic.text.secondary}>{label}</Text>
      {unavailable ? (
        <Text variant="title2" color={t.semantic.text.secondary}>{value}</Text>
      ) : unit ? (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: t.primitive.space['1_5'], flexWrap: 'wrap' }}>
          <Text variant="figure" tabular color={c.value}>{value}</Text>
          <Text variant="figureUnit" color={t.semantic.text.secondary}>{unit}</Text>
        </View>
      ) : (
        <Text variant="displayL" tabular color={c.value}>{value}</Text>
      )}
      <Text variant="bodySmall" color={t.semantic.text.tertiary}>{note}</Text>
    </View>
  )
}
