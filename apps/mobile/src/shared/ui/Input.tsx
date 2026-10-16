// Figma: Input 67:231 (B/Input 421:805)
import { useState } from 'react'
import { TextInput, View, type TextInputProps } from 'react-native'
import { useTheme } from '../theme'
import { textStyle } from '../theme/fonts'
import { Text } from './Text'

type Props = Pick<
  TextInputProps,
  | 'value' | 'onChangeText' | 'placeholder' | 'autoCapitalize' | 'keyboardType' | 'multiline' | 'autoCorrect' | 'spellCheck'
  | 'autoComplete' | 'textContentType' | 'importantForAutofill' | 'onBlur' | 'testID'
> & {
  label: string
  helper?: string
  error?: string
  editable?: boolean
}

/** C03 Input (Redesign B). Label (Label 14/500) over a 56 pt field (Body 16/24), helper and error in Caption. Border is functional (editable recognition, focus, error). */
export function Input({ label, helper, error, editable = true, onBlur, ...field }: Props) {
  const t = useTheme()
  const c = t.component.input
  const [focused, setFocused] = useState(false)
  const border = error ? c.border.error : focused ? c.border.focus : c.border.default
  return (
    <View style={{ gap: c.fieldGap }}>
      <Text variant="label" color={editable ? c.label : t.semantic.text.disabled}>{label}</Text>
      <TextInput
        {...field}
        editable={editable}
        accessibilityLabel={label}
        placeholderTextColor={c.placeholder}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          setFocused(false)
          onBlur?.(e)
        }}
        style={{
          minHeight: t.component.buttonB.height.lg,
          paddingHorizontal: c.paddingX,
          // A multiline field wraps, so its height follows the text; the padding keeps one line centered in the field.
          ...(field.multiline ? { paddingVertical: (t.component.buttonB.height.lg - t.primitive.type.productB.body.lineHeight) / 2, textAlignVertical: 'center' as const } : {}),
          borderRadius: c.radius,
          borderWidth: c.borderWidth,
          borderColor: border,
          backgroundColor: editable ? c.bg.default : c.bg.disabled,
          color: editable ? c.fg : t.semantic.text.disabled,
          ...textStyle(t.primitive.type.productB.body),
        }}
      />
      {error ? <Text variant="caption" color={c.errorText}>{error}</Text> : helper ? <Text variant="caption" color={c.helper}>{helper}</Text> : null}
    </View>
  )
}
