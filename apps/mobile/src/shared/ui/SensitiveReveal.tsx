// Figma: Sensitive reveal 301:668 (Icon / account / backup 137:385)
import { useEffect, useState } from 'react'
import { AppState, Pressable, View } from 'react-native'
import { ko } from '@vaultme/i18n'
import { useTheme } from '../theme'
import { Icon } from './Icon'
import { Text } from './Text'

type Props = { words: readonly string[] }

const COLUMNS = 3

/** C33 Sensitive reveal. Hidden by default; tap to show; hides again when the app leaves the foreground. */
export function SensitiveReveal({ words }: Props) {
  const t = useTheme()
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s !== 'active' && setShown(false))
    return () => sub.remove()
  }, [])
  const rows = Array.from({ length: Math.ceil(words.length / COLUMNS) }, (_, r) => words.slice(r * COLUMNS, r * COLUMNS + COLUMNS).map((w, c) => ({ w, n: r * COLUMNS + c + 1 })))
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={shown ? words.map((w, i) => `${i + 1}, ${w}`).join(', ') : ko.a11y.reveal}
      onPress={() => setShown((s) => !s)}
      style={{
        gap: t.semantic.layout.fieldGap,
        padding: t.primitive.space[3],
        borderRadius: t.semantic.shape.group,
        borderWidth: t.primitive.borderWidth.hairline,
        borderColor: t.semantic.border.subtle,
        backgroundColor: t.semantic.surface.subtle,
        ...(shown ? {} : { minHeight: t.primitive.size.wallet_status_card, alignItems: 'center' as const, justifyContent: 'center' as const }),
      }}
    >
      {shown ? (
        rows.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row', gap: t.semantic.layout.fieldGap }}>
            {row.map(({ w, n }) => (
              <View key={n} style={{ flex: 1, padding: t.primitive.space[3], borderRadius: t.semantic.shape.control, backgroundColor: t.semantic.surface.default }}>
                <Text variant="address">{`${n}. ${w}`}</Text>
              </View>
            ))}
          </View>
        ))
      ) : (
        <>
          <Icon name="backup" size={t.component.icon.size.control} color={t.component.icon.action.fg} />
          <Text variant="label">{ko.a11y.reveal}</Text>
        </>
      )}
    </Pressable>
  )
}
