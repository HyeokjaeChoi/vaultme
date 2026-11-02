// Figma: B/Amount hero 494:1142 (Kind=Review | Result; Figure 44/700 + Figure unit 24/600, baseline)
import Animated from 'react-native-reanimated'
import { View } from 'react-native'
import { useTheme } from '../theme'
import { useCheckPop } from '../theme/motion'
import { AssetIcon, type AssetSymbol } from './AssetIcon'
import { RowBadge, type RowBadgeKind } from './RowBadge'
import { Text } from './Text'
import { TextLink } from './TextLink'

type Props = {
  asset: AssetSymbol
  /** Number part and unit part are split so the unit stays smaller and lighter (Figure + Figure unit). */
  amount: string
  unit: string
  /** One or more sentence lines under the figure. */
  lines?: string[]
  /** Result: centered end moment with a status badge on the logo (56 pt) and a Title 2 headline. Without it: Review (left aligned, logo 48). */
  result?: { badge: RowBadgeKind; title: string }
  /** Small extra line under the sentence (Caption), e.g. the confirmed failure reason of a failed send. */
  note?: string
  /** Failed result: "거래 상세 보기" as an inline Ink + underline link under the text (Figma Detail link). */
  link?: { label: string; onPress: () => void }
  /** Kind=Confirmed (S23 only): logo 96, a 32 pt check badge that scales 0.6 -> 1.0 in 400 ms (Reduce Motion: no scale), Title 1. */
  celebrate?: boolean
  /** Cancelled send: the amount is muted (text/tertiary) and struck through (Figma 888:6726). */
  struck?: boolean
}

/** Amount hero. Review (S22): logo 48, Figure + unit, sentence. Result (S23, S41): logo 56 + row badge, Title 2, Figure + unit, sentence, all centered. The figure is the only 700 weight. */
export function AmountHero({ asset, amount, unit, lines, result, note, link, celebrate, struck }: Props) {
  const t = useTheme()
  const pop = useCheckPop(!!celebrate && !!result)
  const big = !!celebrate && !!result
  const logo = big
    ? t.primitive.size.avatar_lg * 2
    : result
      ? t.primitive.size.avatar_lg + t.primitive.space[2]
      : t.primitive.size.avatar_lg // 96 | 56 | 48
  const align = result ? 'center' : 'flex-start'
  const text = [...(lines ?? []), ...(note ? [note] : [])].join('. ')
  return (
    <View
      accessible
      accessibilityLabel={`${result ? `${result.title}. ` : ''}${amount} ${unit}${text ? `. ${text}` : ''}`}
      style={{
        alignItems: align,
        gap: t.primitive.space[3],
        paddingTop: t.semantic.layout.groupGap,
        paddingBottom: t.primitive.space[6],
        paddingHorizontal: t.semantic.layout.screen.padding,
      }}
    >
      <View style={{ width: logo, height: logo }}>
        <AssetIcon symbol={asset} size={logo} />
        {result ? (
          <View
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              transform: [{ translateX: t.component.rowBadge.ring }, { translateY: t.component.rowBadge.ring }],
            }}
          >
            <Animated.View style={big ? pop : undefined}>
              <RowBadge
                kind={result.badge}
                {...(big ? { size: t.primitive.size.icon_xl - t.component.rowBadge.ring * 2 } : {})}
              />
            </Animated.View>
          </View>
        ) : null}
      </View>
      {result ? (
        <Text variant={big ? 'title1' : 'title2'} accessibilityRole="header" style={{ textAlign: 'center' }}>
          {result.title}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: t.primitive.space['1_5'],
          flexWrap: 'wrap',
          justifyContent: align,
        }}
      >
        <Text
          variant="figure"
          tabular
          {...(struck
            ? { color: t.semantic.text.tertiary, style: { textDecorationLine: 'line-through' as const } }
            : {})}
        >
          {amount}
        </Text>
        <Text
          variant="figureUnit"
          color={struck ? t.semantic.text.tertiary : t.semantic.text.secondary}
          {...(struck ? { style: { textDecorationLine: 'line-through' as const } } : {})}
        >
          {unit}
        </Text>
      </View>
      {lines?.length ? (
        <View>
          {lines.map((l) => (
            <Text
              key={l}
              variant="body"
              color={t.semantic.text.secondary}
              style={result ? { textAlign: 'center' } : undefined}
            >
              {l}
            </Text>
          ))}
        </View>
      ) : null}
      {note ? (
        <Text variant="caption" color={t.semantic.text.secondary} style={{ textAlign: 'center' }}>
          {note}
        </Text>
      ) : null}
      {link ? <TextLink label={link.label} onPress={link.onPress} align="center" /> : null}
    </View>
  )
}
