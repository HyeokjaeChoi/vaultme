// Figma: Address block 68:197 (Icon / action / copy 137:144)
import { Fragment } from 'react'
import { Pressable, Text as RNText, View } from 'react-native'
import { addressA11yLabel, groupAddress } from '../lib/address'
import { textStyle } from '../theme/fonts'
import { useTheme } from '../theme'
import { Icon } from './Icon'
import { Text } from './Text'

type TextProps = { address: string; highlight?: number[]; color?: string; markColor?: string }

/**
 * Full address as one wrapping run of 4-char groups. Only the groups listed in `highlight` are marked
 * (danger color, underline, Medium weight); every other group keeps the normal style.
 */
export function AddressText({ address, highlight = [], color, markColor }: TextProps) {
  const t = useTheme()
  const base = t.component.addressBlock.textStyle
  const hit = { ...textStyle({ ...base, fontWeight: '500' }), color: markColor ?? t.semantic.status.danger.fg, textDecorationLine: 'underline' as const }
  const groups = groupAddress(address)
  return (
    <Text variant="address" color={color ?? t.component.addressBlock.value} accessibilityLabel={addressA11yLabel(address)}>
      {groups.map((g, i) => (
        <Fragment key={i}>
          {i > 0 ? ' ' : ''}
          {highlight.includes(i) ? <RNText style={hit}>{g}</RNText> : g}
        </Fragment>
      ))}
    </Text>
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
