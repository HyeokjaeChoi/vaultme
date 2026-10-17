// Figma: Address block 68:197 (Icon / action / copy 137:144); B/Address 494:1090
import { Fragment } from 'react'
import { Pressable, Text as RNText, View } from 'react-native'
import { addressA11yLabel, displayGroups } from '../lib/address'
import { textStyle } from '../theme/fonts'
import { useTheme } from '../theme'
import { Icon } from './Icon'
import { Text } from './Text'

type TextProps = { address: string; highlight?: number[]; color?: string; markColor?: string; /** S = 14/20 (transaction hash), M = 16/24 (review, result, detail), L = body.lg 18/27 (receive). */ size?: 'S' | 'M' | 'L'; /** First and last group strong + text/primary, middle text/secondary (helps spot address poisoning). Default on. */ emphasis?: boolean }

/**
 * Full address (Figma B/Address 494:1090), one wrapping run of 4-char groups, never truncated. First (0x + 4) and last group are strong (Plex Mono 600, text/primary),
 * the middle groups regular in text/secondary. Groups listed in `highlight` (look-alike diff) use the diff style: strong, danger color, underline (not color alone).
 */
export function AddressText({ address, highlight = [], color, markColor, size = 'M', emphasis = true }: TextProps) {
  const t = useTheme()
  const type = t.primitive.type
  const scale = size === 'L' ? type.body.lg : size === 'S' ? type.productB.address : type.productB.body
  const base = { ...type.productB.address, fontSize: scale.fontSize, lineHeight: scale.lineHeight }
  const strong = textStyle({ ...base, fontWeight: '600' })
  const hit = { ...strong, color: markColor ?? t.semantic.status.danger.fg, textDecorationLine: 'underline' as const }
  const middle = color ?? (emphasis ? t.semantic.text.secondary : t.component.addressBlock.value)
  const ends = color ?? t.semantic.text.primary
  const groups = displayGroups(address)
  return (
    <RNText accessibilityLabel={addressA11yLabel(address)} style={{ ...textStyle(base), color: middle }}>
      {groups.map((g, i) => (
        <Fragment key={i}>
          {i > 0 ? ' ' : ''}
          {highlight.includes(i) ? <RNText style={hit}>{g}</RNText> : emphasis && (i === 0 || i === groups.length - 1) ? <RNText style={{ ...strong, color: ends }}>{g}</RNText> : g}
        </Fragment>
      ))}
    </RNText>
  )
}

type Props = { address: string; label?: string; highlight?: number[]; copyLabel?: string; onCopy?: () => void }

/** C26 Address block. Label (Label, secondary) over the full address; optional 44 px copy action with a visible label. */
export function AddressBlock({ address, label, highlight, copyLabel, onCopy }: Props) {
  const t = useTheme()
  const c = t.component.addressBlock
  return (
    <View style={{ gap: c.gap }}>
      {label ? <Text variant="label" color={t.semantic.text.secondary}>{label}</Text> : null}
      <AddressText address={address} {...(highlight ? { highlight } : {})} />
      {copyLabel ? (
        <Pressable accessibilityRole="button" accessibilityLabel={copyLabel} onPress={onCopy} style={{ flexDirection: 'row', alignItems: 'center', gap: c.gap, minHeight: c.copyTarget }}>
          <View style={{ width: c.copyTarget, height: c.copyTarget, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="copy" size={t.component.icon.size.control} color={t.component.icon.action.fg} />
          </View>
          <Text variant="body" color={t.semantic.text.secondary}>{copyLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
