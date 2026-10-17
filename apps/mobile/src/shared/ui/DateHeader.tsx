// Figma: B/Date header 403:165
import type { ReactNode } from 'react'
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

/** Date group title for the activity list, e.g. "10월 16일 (금)": Label, text/tertiary, space-6 above and space-2 below. */
export function DateHeader({ date, trailing }: { date: string; /** Chip at the right, vertically centered on the date line (Activity: "테스트 데이터" on the first date). Does not change the row height. */ trailing?: ReactNode }) {
  const t = useTheme()
  return (
    <View style={{ paddingTop: t.primitive.space[6], paddingBottom: t.primitive.space[2] }}>
      <Text variant="label" tabular accessibilityRole="header" color={t.semantic.text.tertiary}>{date}</Text>
      {trailing ? <View style={{ position: 'absolute', right: 0, top: t.primitive.space[6], height: t.primitive.type.productB.label.lineHeight, justifyContent: 'center' }}>{trailing}</View> : null}
    </View>
  )
}
