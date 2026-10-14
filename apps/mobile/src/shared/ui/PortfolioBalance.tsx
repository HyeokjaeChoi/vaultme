// Figma: Portfolio balance 68:180 (Quote=Unavailable 68:176)
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

type Props = { label: string; value: string; note: string }

/** C23 Portfolio balance. Secondary-tint summary: label (Body), value (Title 24/600), note (Body). Used for the Unavailable quote state. */
export function PortfolioBalance({ label, value, note }: Props) {
  const t = useTheme()
  const c = t.component.portfolioBalance
  return (
    <View
      accessible
      focusable={false} // Android: no grey keyboard-focus highlight on a read-only row
      accessibilityLabel={`${label}, ${value}. ${note}`}
      style={{ gap: c.gap, padding: c.padding, borderRadius: c.radius, borderWidth: c.borderWidth, backgroundColor: c.bg }}
    >
      <Text variant="body" color={c.note}>{label}</Text>
      <Text variant="title" color={c.value}>{value}</Text>
      <Text variant="body" color={c.note}>{note}</Text>
    </View>
  )
}
