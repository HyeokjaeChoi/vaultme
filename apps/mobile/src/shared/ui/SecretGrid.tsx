// Figma: B/Secret grid 426:2044 (State Hidden 515:44624 / Revealed), Panel 515:27638, Reveal pill 515:27639; Icon / settings / eye 516:253
import { Fragment } from 'react'
import { Pressable, View } from 'react-native'
import Svg, { Defs, FeGaussianBlur, Filter, G, Rect } from 'react-native-svg'
import { useTheme } from '../theme'
import { Icon } from './Icon'
import { Text } from './Text'

const COLS = 2
// Hidden state: decorative blurred bars, never the words. The real phrase is not in memory until the user has authenticated and tapped.
// Word bar widths vary so the panel reads as text. Blur sigma 3.5 = Figma layer blur 7.
const WORD_W = [58, 54, 60, 50, 56, 54]
const SIGMA = 3.5

type Props = {
  /** `null` = hidden: blurred placeholder and the "탭해서 보기" pill. */
  words: readonly string[] | null
  count?: number
  /** Hidden state only: the whole panel is the tap target. */
  onReveal?: () => void
  revealLabel?: string
  /** Auth is pending: taps are ignored. */
  busy?: boolean
}

/** Recovery phrase panel (surface/inset: Light = subtle, Dark one step above the canvas, radius 16, 2 columns of numbered words). Never log or persist the words. */
export function SecretGrid({ words, count = 12, onReveal, revealLabel, busy }: Props) {
  const t = useTheme()
  const shown = words ? words.length : count // revealed: the real word count (12 or 24); `count` sizes the hidden placeholder only
  const per = Math.ceil(shown / COLS)
  const rowH = t.primitive.type.productB.headline.lineHeight
  const gap = t.semantic.layout.rowGap
  const colGap = t.semantic.layout.groupGap
  const height = per * rowH + (per - 1) * gap
  const panel = {
    backgroundColor: t.semantic.surface.inset,
    borderRadius: t.primitive.radius.lg,
    paddingHorizontal: t.primitive.space[4],
    paddingVertical: t.primitive.space[5],
  }
  if (words === null) {
    const colW = 155 // (326 - 16) / 2 at a 390 pt screen; the bars stretch with the panel
    const w = colW * 2 + colGap
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={revealLabel ?? ''}
        accessibilityState={{ disabled: !!busy, busy: !!busy }}
        disabled={!!busy || !onReveal}
        onPress={onReveal}
        style={{ ...panel, justifyContent: 'center' }}
      >
        <Svg
          width="100%"
          height={height}
          viewBox={`0 0 ${String(w)} ${String(height)}`}
          preserveAspectRatio="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          <Defs>
            <Filter id="blur" x="-20%" y="-50%" width="140%" height="200%">
              <FeGaussianBlur stdDeviation={SIGMA} />
            </Filter>
          </Defs>
          <G filter="url(#blur)">
            {Array.from({ length: count }, (_, i) => {
              const col = Math.floor(i / per)
              const r = i % per
              const x = col * (colW + colGap)
              const y = r * (rowH + gap)
              // Rect x/y are SVG geometry. react-native-svg 15.15.4 types inherit the @deprecated tag of the transform x/y props. Remove when the types drop it.
              /* eslint-disable @typescript-eslint/no-deprecated */
              return (
                <Fragment key={i}>
                  <Rect
                    x={x}
                    y={y + rowH / 2 - 5}
                    width={8}
                    height={10}
                    rx={3}
                    fill={t.semantic.text.tertiary}
                    opacity={0.3}
                  />
                  <Rect
                    x={x + 32}
                    y={y + rowH / 2 - 7}
                    width={WORD_W[r % WORD_W.length] ?? 54}
                    height={14}
                    rx={7}
                    fill={t.semantic.text.primary}
                    opacity={0.3}
                  />
                </Fragment>
              )
              /* eslint-enable @typescript-eslint/no-deprecated */
            })}
          </G>
        </Svg>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.primitive.space['1_5'],
            paddingHorizontal: t.primitive.space[4],
            paddingVertical: t.primitive.space[2],
            borderRadius: t.primitive.radius.pill,
            backgroundColor: t.semantic.surface.default,
          }}
        >
          <Icon name="eye" size={t.component.icon.size.control} color={t.component.icon.action.fg} />
          <Text variant="label">{revealLabel}</Text>
        </View>
      </Pressable>
    )
  }
  return (
    <View style={{ ...panel, flexDirection: 'row', gap: colGap }}>
      {Array.from({ length: COLS }, (_, col) => (
        <View key={col} style={{ flex: 1, gap }}>
          {Array.from({ length: per }, (_, r) => {
            const i = col * per + r
            return (
              <View
                key={i}
                accessible
                accessibilityLabel={`${String(i + 1)}, ${words[i] ?? ''}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: t.semantic.layout.fieldGap }}
              >
                <Text
                  variant="caption"
                  tabular
                  color={t.semantic.text.tertiary}
                  style={{ width: t.primitive.space[6] }}
                >
                  {i + 1}
                </Text>
                <Text variant="headline" tabular>
                  {words[i] ?? ''}
                </Text>
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}
