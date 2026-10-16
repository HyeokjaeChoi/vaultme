// Figma: Portfolio balance 68:180 (Quote=Unavailable 68:176); Redesign B: B/Balance hero
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

type Props = {
  label: string
  value: string
  note: string
  /** The value is a "no value" message, not an amount: Title 2 in text/secondary instead of the Display L amount. A missing price is not zero. */
  unavailable?: boolean
}

/** C23 Portfolio balance (Redesign B balance hero). Flat, no fill: label (Label), value (Display L, tabular), note (Body Small). Unavailable: value is Title 2 + text/secondary. */
export function PortfolioBalance({ label, value, note, unavailable }: Props) {
  const t = useTheme()
  const c = t.component.portfolioBalance
  return (
    <View accessible accessibilityLabel={`${label}, ${value}. ${note}`} style={{ gap: c.gap, paddingTop: t.primitive.space[2], paddingBottom: t.primitive.space[4] }}>
      <Text variant="label" color={c.note}>{label}</Text>
      {unavailable ? <Text variant="title2" color={t.semantic.text.secondary}>{value}</Text> : <Text variant="displayL" tabular color={c.value}>{value}</Text>}
      <Text variant="bodySmall" color={c.note}>{note}</Text>
    </View>
  )
}
