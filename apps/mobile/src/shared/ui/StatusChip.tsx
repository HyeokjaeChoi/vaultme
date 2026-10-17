// Figma: B/Status chip 494:1067 (Tone=Testnet / Test data / Network)
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

type Props = { tone: 'testnet' | 'testData' | 'network'; label: string }

/** Persistent honesty chip, pill, Caption. Testnet = amber ("Sepolia 테스트넷"), Test data = info ("테스트 데이터"), Network = neutral. Not a button. */
export function StatusChip({ tone, label }: Props) {
  const t = useTheme()
  const s = t.semantic.status
  const [bg, fg] = tone === 'testnet' ? [s.warning.bg, s.warning.fg] : tone === 'testData' ? [s.info.bg, s.info.fg] : [s.unknown.bg, s.unknown.fg]
  return (
    <View accessible accessibilityLabel={label} style={{ paddingHorizontal: t.primitive.space[2], paddingVertical: t.primitive.space[1], borderRadius: t.primitive.radius.pill, backgroundColor: bg }}>
      <Text variant="caption" color={fg}>{label}</Text>
    </View>
  )
}
