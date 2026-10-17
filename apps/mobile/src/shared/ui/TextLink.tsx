// Figma: Link text style (Product B/Link 500 14/20, Ink + underline); inline links of S23 Failed "거래 상세 보기", S30B "백업하기"
import { Pressable } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

type Props = { label: string; onPress: () => void; accessibilityLabel?: string; align?: 'flex-start' | 'center' }

/** Accent rule link: Ink text + underline (never blue), 44 pt target. */
export function TextLink({ label, onPress, accessibilityLabel, align = 'flex-start' }: Props) {
  const t = useTheme()
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={accessibilityLabel ?? label} onPress={onPress} style={{ minHeight: t.primitive.size.touch_min, justifyContent: 'center', alignSelf: align }}>
      <Text variant="link" color={t.semantic.text.link}>{label}</Text>
    </Pressable>
  )
}
