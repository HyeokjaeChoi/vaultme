// Figma: Amount field 40:28
import { TextInput, View } from 'react-native'
import { textStyle } from '../theme/fonts'
import { useTheme } from '../theme'
import { Text } from './Text'

type Props = { label: string; value: string; onChangeText: (v: string) => void; balance: string; note: string }

/** C14 Amount field: bordered group, Label, amount (32/500), spendable balance and fee-reserve note. */
export function AmountField({ label, value, onChangeText, balance, note }: Props) {
  const t = useTheme()
  const c = t.component.amountField
  return (
    <View style={{ gap: t.semantic.layout.fieldGap, padding: c.padding, borderRadius: c.radius, borderWidth: c.borderWidth, borderColor: c.border.default, backgroundColor: c.bg }}>
      <Text variant="label" color={c.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        style={{ padding: 0, color: c.value, ...textStyle(c.valueStyle) }}
      />
      <Text variant="body" color={c.balance}>{balance}</Text>
      <Text variant="body" color={t.semantic.text.secondary}>{note}</Text>
    </View>
  )
}
