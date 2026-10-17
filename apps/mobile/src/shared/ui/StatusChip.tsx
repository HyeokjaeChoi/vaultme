// Figma: B/Status chip 494:1067 (one neutral chip; Tone variants removed 2026-10-17)
import { Pressable, View } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

type Props = { label: string; /** Home only: tapping the chip opens its explainer sheet. Elsewhere the chip is static. */ onPress?: () => void }

/**
 * The one honesty chip: pill, Caption, neutral (`component.chip.bg/fg`, accent rule: no amber, no blue). Static, except on Home where it opens the explainer sheet (ux-copy S10);
 * the 44 pt target comes from hitSlop.
 */
export function StatusChip({ label, onPress }: Props) {
  const t = useTheme()
  const body = (
    <View style={{ paddingHorizontal: t.primitive.space[2], paddingVertical: t.primitive.space[1], borderRadius: t.primitive.radius.pill, backgroundColor: t.component.chip.bg }}>
      <Text variant="caption" color={t.component.chip.fg}>{label}</Text>
    </View>
  )
  const slop = Math.max(0, (t.primitive.size.touch_min - t.primitive.space[1] * 2 - t.primitive.type.productB.caption.lineHeight) / 2)
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={{ top: slop, bottom: slop, left: t.primitive.space[1], right: t.primitive.space[1] }}>{body}</Pressable>
  ) : (
    <View accessible accessibilityLabel={label}>{body}</View>
  )
}
