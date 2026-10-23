// Figma: Portfolio balance 68:180 (Quote=Unavailable 68:176); Redesign B: B/Balance hero
import { Pressable, View } from 'react-native'
import { useTheme } from '../theme'
import { Icon } from './Icon'
import { Text } from './Text'

type Props = {
  label: string
  value: string
  /** Splits the figure: `value` is the number (Figure 44/700), `unit` the smaller, lighter unit (Figure unit 24/600), on one baseline. */
  unit?: string
  note: string
  /** The value is a "no value" message, not an amount: Title 2 in text/secondary instead of the Display L amount. A missing price is not zero. */
  unavailable?: boolean
  /** The label is a way in to the asset ("Sepolia ETH ›"): tap opens the asset detail. */
  onLabelPress?: () => void
}

/** C23 Portfolio balance (Redesign B balance hero). Flat, no fill: label (Label, secondary), value (Display L, tabular), note (Body Small, tertiary), padding top 24 / bottom 16 (Figma 399:98). Unavailable: value is Title 2 + text/secondary. */
export function PortfolioBalance({ label, value, unit, note, unavailable, onLabelPress }: Props) {
  const t = useTheme()
  const c = t.component.portfolioBalance
  return (
    <View
      accessibilityLabel={`${label}, ${value}${unit ? ` ${unit}` : ''}. ${note}`}
      accessible={!onLabelPress}
      style={{ gap: c.gap, paddingTop: t.primitive.space[6], paddingBottom: t.primitive.space[4] }}
    >
      {onLabelPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={onLabelPress}
          hitSlop={{ top: t.primitive.space[3], bottom: t.primitive.space[3], right: t.primitive.space[4] }}
          style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' }}
        >
          <Text variant="label" color={t.semantic.text.secondary}>
            {label}
          </Text>
          <Icon name="disclosure" size={t.primitive.size.icon_sm} color={t.semantic.text.secondary} />
        </Pressable>
      ) : (
        <Text variant="label" color={t.semantic.text.secondary}>
          {label}
        </Text>
      )}
      {unavailable ? (
        <Text variant="title2" color={t.semantic.text.secondary}>
          {value}
        </Text>
      ) : unit ? (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: t.primitive.space['1_5'], flexWrap: 'wrap' }}>
          <Text variant="figure" tabular color={c.value}>
            {value}
          </Text>
          <Text variant="figureUnit" color={t.semantic.text.secondary}>
            {unit}
          </Text>
        </View>
      ) : (
        <Text variant="displayL" tabular color={c.value}>
          {value}
        </Text>
      )}
      <Text variant="bodySmall" color={t.semantic.text.tertiary}>
        {note}
      </Text>
    </View>
  )
}
