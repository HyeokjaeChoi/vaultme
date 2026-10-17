// Figma: B/Word cell 565:73619 (State Empty 565:73599 / Focus 565:73604 / Filled 565:73609 / Error 565:73614)
import { type Ref } from 'react'
import { Platform, TextInput, View, type NativeSyntheticEvent, type TextInputKeyPressEventData } from 'react-native'
import { useTheme } from '../theme'
import { textStyle } from '../theme/fonts'
import { Text } from './Text'

// A multiline UITextView draws its text this far below the center of its row (measured on iOS 27, S05 capture 2026-10-17: the word sat 2 pt low next to the number).
// Remove when the field is single-line again or React Native fixes the inset.
const IOS_MULTILINE_DROP = 2

type Props = {
  /** Visible number, also the accessible name through `label` ("3번째 단어"). */
  number: number
  label: string
  value: string
  error?: boolean
  /** Focus look (border + caret color). The page tracks which cell is focused, so a design capture can show it without a keyboard. */
  focused?: boolean
  last?: boolean
  inputRef?: Ref<TextInput>
  onChangeText: (v: string) => void
  onFocus?: () => void
  onBlur?: () => void
  /** Space / Return in the cell: go to the next one (the page decides; past the last cell it closes the keyboard). */
  onNext: () => void
  /** Backspace while the cell is empty: go to the previous cell. */
  onBackspaceEmpty: () => void
}

/**
 * One recovery word (S05). Number on the left (fixed 20 wide, Caption, text/tertiary), word in Body. Height 48 (padding space/3 + Body 24).
 * Border: default, focus (input.border.focus + caret in the same color), error (input.border.error only; the message sits under the grid).
 * Keyboard: ASCII, no auto-capitalize / auto-correct / spell check / suggestions. No haptic. The word is not secret on screen, so no secureTextEntry;
 * nothing here logs it.
 */
export function WordCell({ number, label, value, error, focused, last, inputRef, onChangeText, onFocus, onBlur, onNext, onBackspaceEmpty }: Props) {
  const t = useTheme()
  const c = t.component.input
  const border = error ? c.border.error : focused ? c.border.focus : c.border.default
  const onKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Backspace' && value === '') onBackspaceEmpty()
  }
  return (
    <View
      style={{
        height: t.primitive.space[3] * 2 + t.primitive.type.productB.body.lineHeight,
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.primitive.space[2],
        padding: t.primitive.space[3],
        borderRadius: c.radius,
        borderWidth: c.borderWidth,
        borderColor: border,
        backgroundColor: c.bg.default,
      }}
    >
      <View importantForAccessibility="no-hide-descendants" accessible={false} style={{ width: t.primitive.space[5] }}>
        <Text variant="caption" color={t.semantic.text.tertiary} tabular>{number}</Text>
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        accessibilityLabel={label}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyPress={onKeyPress}
        onSubmitEditing={onNext}
        // multiline keeps pasted line breaks (a single-line field may drop them); Return still submits, never adds a line.
        multiline
        submitBehavior="submit"
        returnKeyType={last ? 'done' : 'next'}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        autoComplete="off"
        textContentType="none"
        importantForAutofill="no"
        keyboardType={Platform.OS === 'android' ? 'visible-password' : 'ascii-capable'}
        cursorColor={c.border.focus}
        selectionColor={c.border.focus}
        style={{ flex: 1, padding: 0, transform: [{ translateY: Platform.OS === 'ios' ? -IOS_MULTILINE_DROP : 0 }], color: c.fg, textAlignVertical: 'center', ...textStyle(t.primitive.type.productB.body) }}
      />
    </View>
  )
}
