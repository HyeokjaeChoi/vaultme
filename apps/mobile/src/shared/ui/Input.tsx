// Figma: Input 67:231
import { useState } from 'react'
import { TextInput, View, type TextInputProps } from 'react-native'
import { useTheme } from '../theme'
import { textStyle } from '../theme/fonts'
import { Text } from './Text'

type Props = Pick<TextInputProps, 'value' | 'onChangeText' | 'placeholder' | 'autoCapitalize' | 'keyboardType' | 'multiline'> & {
  label: string
  helper?: string
  error?: string
  editable?: boolean
}

/** C03 Input. Border is functional (editable recognition, focus, error). */
export function Input({ label, helper, error, editable = true, ...field }: Props) {
  const t = useTheme()
  const c = t.component.input
  const [focused, setFocused] = useState(false)
  const border = error ? c.border.error : focused ? c.border.focus : c.border.default
  return (
    <View style={{ gap: c.fieldGap }}>
      <Text variant="label" color={c.label}>{label}</Text>
      <TextInput
        {...field}
        editable={editable}
        accessibilityLabel={label}
        placeholderTextColor={c.placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          minHeight: c.height,
          paddingHorizontal: c.paddingX,
          borderRadius: c.radius,
          borderWidth: c.borderWidth,
          borderColor: border,
          backgroundColor: editable ? c.bg.default : c.bg.disabled,
          color: c.fg,
          ...textStyle(t.semantic.typography.row),
        }}
      />
      {error ? <Text color={c.errorText}>{error}</Text> : helper ? <Text color={c.helper}>{helper}</Text> : null}
    </View>
  )
}
