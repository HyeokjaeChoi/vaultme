// Figma: Input 67:231 (B/Input 421:805)
import { useState, type Ref } from 'react'
import { Pressable, TextInput, View, type TextInputProps } from 'react-native'
import { useTheme } from '../theme'
import { textStyle } from '../theme/fonts'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

type Props = Pick<
  TextInputProps,
  | 'value' | 'onChangeText' | 'placeholder' | 'autoCapitalize' | 'keyboardType' | 'multiline' | 'autoCorrect' | 'spellCheck'
  | 'autoComplete' | 'textContentType' | 'importantForAutofill' | 'onBlur' | 'testID' | 'secureTextEntry'
> & {
  label: string
  helper?: string
  error?: string
  editable?: boolean
  /** Ref to the TextInput, e.g. to focus the first invalid field. */
  inputRef?: Ref<TextInput>
  /** Link actions inside the field under the text, right aligned (B/Input Kind=Address 421:773, e.g. 붙여넣기). The text then uses Address mono. */
  actions?: { label: string; onPress: () => void }[]
  /** Icon button at the right end of the field (B/Input `Show action` 421:805, e.g. the passphrase eye). 44 x 44 touch area, `label` = its accessible name. */
  action?: { icon: IconName; label: string; onPress: () => void }
}

/** C03 Input (Redesign B). Label (Label 14/500) over a 56 pt field (Body 16/24), helper and error in Caption. Border is functional (editable recognition, focus, error). */
export function Input({ label, helper, error, editable = true, onBlur, actions, action, inputRef, ...field }: Props) {
  const t = useTheme()
  const c = t.component.input
  const [focused, setFocused] = useState(false)
  const border = error ? c.border.error : focused ? c.border.focus : c.border.default
  const textFont = textStyle(actions ? t.primitive.type.productB.address : t.primitive.type.productB.body)
  const input = (
    <TextInput
      {...field}
      ref={inputRef}
      editable={editable}
      accessibilityLabel={label}
      placeholderTextColor={c.placeholder}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        setFocused(false)
        onBlur?.(e)
      }}
      style={
        actions
          ? { padding: 0, color: c.fg, ...textFont }
          : {
              minHeight: t.component.buttonB.height.lg,
              paddingLeft: c.paddingX,
              paddingRight: action ? t.primitive.size.touch_min : c.paddingX,
              // A multiline field wraps, so its height follows the text; the padding keeps one line centered in the field.
              ...(field.multiline ? { paddingVertical: (t.component.buttonB.height.lg - t.primitive.type.productB.body.lineHeight) / 2, textAlignVertical: 'center' as const } : {}),
              borderRadius: c.radius,
              borderWidth: c.borderWidth,
              borderColor: border,
              backgroundColor: editable ? c.bg.default : c.bg.disabled,
              color: editable ? c.fg : t.semantic.text.disabled,
              ...textFont,
            }
      }
    />
  )
  return (
    <View style={{ gap: c.fieldGap }}>
      <Text variant="label" color={editable ? c.label : t.semantic.text.disabled}>{label}</Text>
      {actions ? (
        <View style={{ minHeight: t.component.buttonB.height.lg, gap: t.primitive.space[2], paddingHorizontal: c.paddingX, paddingVertical: t.primitive.space[4], borderRadius: c.radius, borderWidth: c.borderWidth, borderColor: border, backgroundColor: c.bg.default }}>
          {input}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: t.semantic.layout.groupGap }}>
            {actions.map((a) => (
              <Pressable key={a.label} accessibilityRole="button" accessibilityLabel={a.label} onPress={a.onPress} style={{ minHeight: t.primitive.size.touch_min, justifyContent: 'center' }}>
                <Text variant="link" color={t.semantic.text.link}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        action ? (
          <View>
            {input}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={action.label}
              onPress={action.onPress}
              style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: t.primitive.size.touch_min, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name={action.icon} size={t.component.icon.size.control} color={t.component.icon.action.fg} />
            </Pressable>
          </View>
        ) : (
          input
        )
      )}
      {error ? <Text variant="caption" color={c.errorText}>{error}</Text> : helper ? <Text variant="caption" color={c.helper}>{helper}</Text> : null}
    </View>
  )
}
