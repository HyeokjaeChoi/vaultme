// Figma: Recipient field 40:17; Redesign B: B/Input Kind=Address 421:773 (Default), 421:781 (Focus), 421:789 (Invalid)
import { useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { groupAddress } from '../lib/address'
import { textStyle } from '../theme/fonts'
import { useTheme } from '../theme'
import { Text } from './Text'

type Action = { label: string; onPress: () => void }
type Props = { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; error?: string; actions?: Action[] }

/** C13 Recipient field (B/Input, Address kind): Label, bordered field (functional border: editable, focus, error) with the address in Address mono, 4-char groups, and link actions (붙여넣기) inside the field. The format check is not a safety claim. */
export function RecipientField({ label, value, onChangeText, placeholder, error, actions }: Props) {
  const [focused, setFocused] = useState(false)
  const t = useTheme()
  const c = t.component.input
  const border = error ? c.border.error : focused ? c.border.focus : c.border.default
  return (
    <View style={{ gap: c.fieldGap }}>
      <Text variant="label" color={c.label}>{label}</Text>
      <View style={{ minHeight: t.component.buttonB.height.lg, gap: t.primitive.space[2], paddingHorizontal: c.paddingX, paddingVertical: t.primitive.space[4], borderRadius: c.radius, borderWidth: c.borderWidth, borderColor: border, backgroundColor: c.bg.default }}>
        <TextInput
          accessibilityLabel={label}
          value={focused ? value : groupAddress(value).join(' ')}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChangeText={(v) => onChangeText(v.replace(/\s/g, ''))}
          multiline
          placeholder={placeholder}
          placeholderTextColor={c.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ padding: 0, color: c.fg, ...textStyle(t.primitive.type.productB.address) }}
        />
        {actions?.length ? (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: t.semantic.layout.groupGap }}>
            {actions.map((a) => (
              <Pressable key={a.label} accessibilityRole="button" accessibilityLabel={a.label} onPress={a.onPress} style={{ minHeight: t.primitive.size.touch_min, justifyContent: 'center' }}>
                <Text variant="label" color={t.semantic.text.link}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      {error ? <Text variant="caption" color={c.errorText}>{error}</Text> : null}
    </View>
  )
}
