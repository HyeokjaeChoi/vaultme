// Figma: Asset row 36:20 (inside the white Assets group 333:258) (Icon / Asset / ETH 137:402, USDC 137:429); Redesign B: B/Row
import { View } from 'react-native'
import { useTheme } from '../theme'
import { AssetIcon, type AssetSymbol } from './AssetIcon'
import { Text } from './Text'

type Props = { name: string; symbol: AssetSymbol; balance: string; note: string }

/** C09 Asset row (Redesign B row). Flat, min-height rowB.height 64, no fill, no divider, paddingX 0 (the screen pads): 40 circle icon, name (Headline) + symbol (Caption tertiary), balance (Headline, tabular) + note (Caption). A missing quote is not zero. */
export function AssetRow({ name, symbol, balance, note }: Props) {
  const t = useTheme()
  const c = t.component.assetRow
  return (
    <View
      accessible
      accessibilityLabel={`${name}, ${balance} ${symbol}, ${note}`}
      style={{ minHeight: t.component.rowB.height, flexDirection: 'row', alignItems: 'center', gap: t.semantic.layout.rowGap }}
    >
      <View style={{ width: t.primitive.size.avatar_md, height: t.primitive.size.avatar_md, borderRadius: t.primitive.radius.pill, backgroundColor: t.semantic.surface.subtle, alignItems: 'center', justifyContent: 'center' }}>
        <AssetIcon symbol={symbol} size={t.component.icon.asset.size} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="headline" color={c.name}>{name}</Text>
        <Text variant="caption" color={t.semantic.text.tertiary}>{symbol}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
        <Text variant="headline" tabular color={c.balance} style={{ textAlign: 'right' }}>{balance}</Text>
        <Text variant="caption" color={c.missingQuote} style={{ textAlign: 'right' }}>{note}</Text>
      </View>
    </View>
  )
}
