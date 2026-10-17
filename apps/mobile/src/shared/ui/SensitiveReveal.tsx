// Figma: Sensitive reveal 301:668 (Icon / account / backup 137:385)
import { Pressable, View } from 'react-native'
import { ko } from '@vaultme/i18n'
import { useTheme } from '../theme'
import { Icon } from './Icon'
import { Text } from './Text'

type Props = {
  /** `null` = hidden. The owner decides when to reveal (after OS auth) and clears it on leave/background. */
  words: readonly string[] | null
  /** Tap on the hidden card. */
  onReveal: () => void
  /** Small line under the hidden label. */
  hint?: string
  /** Blocks taps while auth is pending. */
  busy?: boolean
}

const COLUMNS = 3

/** C33 Sensitive reveal. Controlled: hidden while `words` is null, shows the numbered words otherwise. Tapping the hidden card asks the owner to reveal; it holds no secret state itself. */
export function SensitiveReveal({ words, onReveal, hint, busy }: Props) {
  const t = useTheme()
  const shown = words !== null
  const list = words ?? []
  const rows = Array.from({ length: Math.ceil(list.length / COLUMNS) }, (_, r) => list.slice(r * COLUMNS, r * COLUMNS + COLUMNS).map((w, c) => ({ w, n: r * COLUMNS + c + 1 })))
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={shown ? list.map((w, i) => `${i + 1}, ${w}`).join(', ') : ko.a11y.reveal}
      accessibilityState={{ disabled: shown || busy === true, busy: busy === true }}
      disabled={shown || busy}
      onPress={onReveal}
      style={{
        gap: t.semantic.layout.fieldGap,
        padding: t.primitive.space[3],
        borderRadius: t.component.sensitiveReveal.radius,
        borderWidth: t.primitive.borderWidth.hairline,
        borderColor: t.component.sensitiveReveal.border,
        backgroundColor: t.component.sensitiveReveal.bg,
        ...(shown ? {} : { minHeight: t.primitive.size.wallet_status_card, alignItems: 'center' as const, justifyContent: 'center' as const }),
      }}
    >
      {shown ? (
        rows.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row', gap: t.semantic.layout.fieldGap }}>
            {row.map(({ w, n }) => (
              <View key={n} style={{ flex: 1, padding: t.primitive.space[3], borderRadius: t.semantic.shape.control, backgroundColor: t.component.sensitiveReveal.wordBg }}>
                <Text variant="address">{`${n}. ${w}`}</Text>
              </View>
            ))}
          </View>
        ))
      ) : (
        <>
          <Icon name="backup" size={t.component.icon.size.control} color={t.component.icon.action.fg} />
          <Text variant="label" color={t.component.sensitiveReveal.fg}>{ko.a11y.reveal}</Text>
          {hint ? <Text variant="caption" color={t.component.sensitiveReveal.hint}>{hint}</Text> : null}
        </>
      )}
    </Pressable>
  )
}
