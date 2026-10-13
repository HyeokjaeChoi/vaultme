// Figma: Asset row 36:20 (Icon / Asset / ETH 137:402, USDC 137:429)
import { View } from 'react-native'
import { useTheme } from '../theme'
import { AssetIcon, type AssetSymbol } from './AssetIcon'
import { Text } from './Text'

type Props = { name: string; symbol: AssetSymbol; balance: string; note: string }

/** C09 Asset row. Flat white row: identity (icon, name, symbol) and trailing values (exact balance, quote note). A missing quote is not zero. */
export function AssetRow({ name, symbol, balance, note }: Props) {
  const t = useTheme()
  const c = t.component.assetRow
  return (
    <View
      accessible
      accessibilityLabel={`${name}, ${balance} ${symbol}, ${note}`}
      style={{
        minHeight: c.minHeight,
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.semantic.layout.rowGap,
        paddingHorizontal: c.list.paddingX,
        paddingVertical: c.list.paddingY,
        backgroundColor: c.bg,
        borderRadius: c.list.radius,
      }}
    >
      <View style={{ width: c.iconSize, height: c.iconSize, borderRadius: t.semantic.shape.control, backgroundColor: t.semantic.surface.subtle, alignItems: 'center', justifyContent: 'center' }}>
        <AssetIcon symbol={symbol} size={t.component.icon.asset.size} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="row" color={c.name}>{name}</Text>
        <Text variant="body" color={c.symbol}>{symbol}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
        <Text variant="row" color={c.balance} style={{ textAlign: 'right' }}>{balance}</Text>
        <Text variant="body" color={c.missingQuote} style={{ textAlign: 'right' }}>{note}</Text>
      </View>
    </View>
  )
}
