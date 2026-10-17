// Figma: B/Status chip 494:1067 (Tone=Testnet / Test data / Network)
import { Pressable, View } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

type Props = { tone: 'testnet' | 'testData' | 'network'; label: string; /** Home only: tapping the chip opens its explainer sheet. Elsewhere the chip is static. */ onPress?: () => void }

/** Persistent honesty chip, pill, Caption. Testnet = amber ("Sepolia 테스트넷"), Test data = info ("테스트 데이터"), Network = neutral. Static, except on Home where it opens the explainer sheet (ux-copy S10); the 44 pt target comes from hitSlop. */
export function StatusChip({ tone, label, onPress }: Props) {
  const t = useTheme()
  const s = t.semantic.status
  const [bg, fg] = tone === 'testnet' ? [s.warning.bg, s.warning.fg] : tone === 'testData' ? [s.info.bg, s.info.fg] : [s.unknown.bg, s.unknown.fg]
  const body = (
    <View style={{ paddingHorizontal: t.primitive.space[2], paddingVertical: t.primitive.space[1], borderRadius: t.primitive.radius.pill, backgroundColor: bg }}>
      <Text variant="caption" color={fg}>{label}</Text>
    </View>
  )
  const slop = Math.max(0, (t.primitive.size.touch_min - t.primitive.space[2] * 2 - t.primitive.type.productB.caption.lineHeight) / 2)
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={{ top: slop, bottom: slop, left: t.primitive.space[1], right: t.primitive.space[1] }}>{body}</Pressable>
  ) : (
    <View accessible accessibilityLabel={label}>{body}</View>
  )
}
