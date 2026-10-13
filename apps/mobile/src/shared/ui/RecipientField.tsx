// Figma: Recipient field 40:17
import { TextInput, View } from 'react-native'
import { groupAddress } from '../lib/address'
import { textStyle } from '../theme/fonts'
import { useTheme } from '../theme'
import { Text } from './Text'

type Props = { label: string; value: string; onChangeText: (v: string) => void; helper: string; placeholder?: string }

/** C13 Recipient field: bordered group, Label, address in Product / Address (mono), shown in 4-char groups, helper. Format check is not a safety claim. */
export function RecipientField({ label, value, onChangeText, helper, placeholder }: Props) {
  const t = useTheme()
  const c = t.component.recipientField
  return (
    <View style={{ gap: t.semantic.layout.fieldGap, padding: c.padding, borderRadius: c.radius, borderWidth: c.borderWidth, borderColor: c.border.default, backgroundColor: c.bg }}>
      <Text variant="label" color={c.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={groupAddress(value).join(' ')}
        onChangeText={(v) => onChangeText(v.replace(/\s/g, ''))}
        multiline
        placeholder={placeholder}
        placeholderTextColor={t.component.input.placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        style={{ padding: 0, color: c.value, ...textStyle(c.valueStyle) }}
      />
      <Text variant="body" color={c.helper}>{helper}</Text>
    </View>
  )
}
