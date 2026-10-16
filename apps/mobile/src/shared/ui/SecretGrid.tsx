// Figma: B/Secret grid 426:2044 (State Hidden / Revealed)
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

const COLS = 2

/** Recovery phrase grid: 2 columns of numbered words (Caption number + Headline word). `words` null = hidden, shown as masked dots. Never log or persist the words. */
export function SecretGrid({ words, count = 12 }: { words: readonly string[] | null; count?: number }) {
  const t = useTheme()
  const per = Math.ceil(count / COLS)
  return (
    <View style={{ flexDirection: 'row', gap: t.semantic.layout.groupGap }}>
      {Array.from({ length: COLS }, (_, col) => (
        <View key={col} style={{ flex: 1, gap: t.semantic.layout.rowGap }}>
          {Array.from({ length: per }, (_, r) => {
            const i = col * per + r
            return (
              <View key={i} accessible accessibilityLabel={words ? `${i + 1}, ${words[i] ?? ''}` : String(i + 1)} style={{ flexDirection: 'row', alignItems: 'center', gap: t.semantic.layout.fieldGap }}>
                <Text variant="caption" tabular color={t.semantic.text.tertiary} style={{ width: t.primitive.space[6] }}>{i + 1}</Text>
                <Text variant="headline" tabular>{words ? (words[i] ?? '') : '••••••'}</Text>
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}
