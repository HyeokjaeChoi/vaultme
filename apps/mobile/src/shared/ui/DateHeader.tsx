// Figma: B/Date header 403:165
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

/** Date group title for the activity list, e.g. "10월 16일 (금)": Label, text/tertiary, space-6 above and space-2 below. */
export function DateHeader({ date }: { date: string }) {
  const t = useTheme()
  return (
    <View style={{ paddingTop: t.primitive.space[6], paddingBottom: t.primitive.space[2] }}>
      <Text variant="label" tabular accessibilityRole="header" color={t.semantic.text.tertiary}>
        {date}
      </Text>
    </View>
  )
}
