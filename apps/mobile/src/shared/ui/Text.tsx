// Figma: Product type styles (Label, Section, Body, Title, Row, Meta, Review Amount, Address) mapped to semantic.typography; no single component node
import { Text as RNText, type TextProps } from 'react-native'
import type { Theme } from '@vaultme/tokens'
import { textStyle } from '../theme/fonts'
import { useTheme } from '../theme'

/** `title` = Product / Title 24/32 (page and question titles), `amountHero` = Product / Amount Hero 40/48 Bold. All come from semantic.typography. */
export type TextVariant = keyof Theme['semantic']['typography'] | 'display'

type Props = TextProps & { variant?: TextVariant; color?: string }

export function Text({ variant = 'body', color, style, ...rest }: Props) {
  const t = useTheme()
  return <RNText maxFontSizeMultiplier={variant === 'amountHero' ? 1.2 : 1.5} {...rest} style={[textStyle(variant === 'display' ? t.primitive.type.display.mobile : t.semantic.typography[variant]), { color: color ?? t.semantic.text.primary }, style]} />
}
