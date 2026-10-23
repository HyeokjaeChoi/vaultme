// Figma: B/Amount display 422:636 (State Default / Error; Amount = Product B/Figure, Ticker = Figure unit, baseline)
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

type Props = { amount: string; ticker: string; sub?: string; error?: boolean }

/** Amount entry hero: amount in Figure (700, tabular) + ticker in Figure unit on one baseline, optional Body Small line, all centered (Figma S20B composed column). Error colors the amount text/danger; the notice under it carries the reason in words. */
export function AmountDisplay({ amount, ticker, sub, error }: Props) {
  const t = useTheme()
  return (
    <View
      accessible
      accessibilityLabel={`${amount} ${ticker}${sub ? `. ${sub}` : ''}`}
      style={{ alignItems: 'center', gap: t.primitive.space[2], paddingVertical: t.semantic.layout.groupGap }}
    >
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'center',
          gap: t.primitive.space['1_5'],
        }}
      >
        <Text variant="figure" tabular color={error ? t.semantic.status.danger.fg : t.semantic.text.primary}>
          {amount}
        </Text>
        <Text variant="figureUnit" color={t.semantic.text.secondary}>
          {ticker}
        </Text>
      </View>
      {sub ? (
        <Text variant="bodySmall" tabular color={t.semantic.text.secondary} style={{ textAlign: 'center' }}>
          {sub}
        </Text>
      ) : null}
    </View>
  )
}
