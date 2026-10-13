// Figma: Product type styles (Label, Section, Body, Title, Row, Meta, Review Amount, Address) mapped to semantic.typography; no single component node
import { Text as RNText, type TextProps } from 'react-native'
import type { Theme } from '@vaultme/tokens'
import { textStyle } from '../theme/fonts'
import { useTheme } from '../theme'

export type TextVariant = keyof Theme['semantic']['typography'] | 'display' | 'h1'

type Props = TextProps & { variant?: TextVariant; color?: string }

export function Text({ variant = 'body', color, style, ...rest }: Props) {
  const t = useTheme()
  return <RNText {...rest} style={[textStyle(variant === 'display' ? t.primitive.type.display.mobile : variant === 'h1' ? t.primitive.type.heading.h1.mobile : t.semantic.typography[variant]), { color: color ?? t.semantic.text.primary }, style]} />
}
