// Figma: B/Amount display 422:636 (State Default / Error)
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

type Props = { amount: string; ticker: string; sub?: string; error?: boolean }

/** Amount hero: amount in Display L (tabular) + ticker in Title 2, optional Body Small line. Error colors the amount text/danger; the sub line then carries the reason in words. */
export function AmountDisplay({ amount, ticker, sub, error }: Props) {
  const t = useTheme()
  return (
    <View accessible accessibilityLabel={`${amount} ${ticker}${sub ? `. ${sub}` : ''}`} style={{ gap: t.primitive.space[2], paddingVertical: t.semantic.layout.groupGap }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: t.primitive.space[2] }}>
        <Text variant="displayL" tabular color={error ? t.semantic.status.danger.fg : t.semantic.text.primary}>{amount}</Text>
        <Text variant="title2" tabular color={t.semantic.text.secondary}>{ticker}</Text>
      </View>
      {sub ? <Text variant="bodySmall" tabular color={t.semantic.text.secondary}>{sub}</Text> : null}
    </View>
  )
}
