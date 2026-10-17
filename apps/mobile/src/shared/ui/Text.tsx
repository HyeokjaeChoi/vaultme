// Figma: Product B type styles (Display L, Display M, Title 1-3, Headline, Body, Body Small, Label, Caption, Address) from @vaultme/tokens type.productB; no single component node
import { Text as RNText, type TextProps } from 'react-native'
import type { Theme } from '@vaultme/tokens'
import { TABULAR, textStyle } from '../theme/fonts'
import { useTheme } from '../theme'

type BVariant = keyof Theme['primitive']['type']['productB']
/** Pre-Redesign-B names, kept so older call sites compile. Prefer the Product B name. */
const LEGACY = { title: 'title1', amountHero: 'displayL', display: 'displayL', row: 'headline', section: 'title2', meta: 'caption' } as const satisfies Record<string, BVariant>
export type TextVariant = BVariant | keyof typeof LEGACY

type Props = TextProps & { variant?: TextVariant; color?: string; /** Amounts and counts: tabular numerals so columns align. */ tabular?: boolean }

export function Text({ variant = 'body', color, tabular, style, ...rest }: Props) {
  const t = useTheme()
  const name: BVariant = variant in LEGACY ? LEGACY[variant as keyof typeof LEGACY] : (variant as BVariant)
  // lineBreakStrategyIOS 'hangul-word': Hangul breaks at spaces only, so a line never ends with a lone "요." (RN 0.86 Text docs, iOS 14+; Android already breaks Korean at spaces).
  return <RNText lineBreakStrategyIOS="hangul-word" {...rest} style={[textStyle(t.primitive.type.productB[name]), tabular ? TABULAR : null, { color: color ?? t.semantic.text.primary }, style]} />
}
