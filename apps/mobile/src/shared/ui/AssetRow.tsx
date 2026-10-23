// Figma: Asset row 36:20 (inside the white Assets group 333:258) (Icon / Asset / ETH 137:402, USDC 137:429); Redesign B: B/Row
import { Pressable, View } from 'react-native'
import { useTheme } from '../theme'
import { AssetIcon, type AssetSymbol } from './AssetIcon'
import { Text } from './Text'

type Props = {
  name: string
  symbol: AssetSymbol
  /** Caption under the name: "테스트넷" / "테스트 토큰" (Figma 2026-10-17; the symbol repeated the title). */ subtitle: string
  balance: string
  note?: string
  onPress?: () => void
}

/** C09 Asset row (Redesign B row). Flat, min-height rowB.height 64, no fill, no divider, paddingX 0 (the screen pads): 40 circle icon, name (Row title 500) + subtitle (Caption tertiary), balance (Headline, tabular) + note (Caption). A missing quote is not zero. */
export function AssetRow({ name, symbol, subtitle, balance, note, onPress }: Props) {
  const t = useTheme()
  const c = t.component.assetRow
  const row = (
    <View
      accessible
      accessibilityLabel={`${name}, ${balance} ${symbol}${note ? `, ${note}` : ''}`}
      style={{
        minHeight: t.component.rowB.height,
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.semantic.layout.rowGap,
      }}
    >
      <View
        style={{
          width: t.primitive.size.avatar_md,
          height: t.primitive.size.avatar_md,
          borderRadius: t.primitive.radius.pill,
          backgroundColor: t.semantic.surface.subtle,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AssetIcon symbol={symbol} size={t.component.icon.asset.size} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="rowTitle" color={c.name}>
          {name}
        </Text>
        <Text variant="caption" color={t.semantic.text.tertiary}>
          {subtitle}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
        <Text variant="headline" tabular color={c.balance} style={{ textAlign: 'right' }}>
          {balance} {symbol}
        </Text>
        {note ? (
          <Text variant="caption" color={c.missingQuote} style={{ textAlign: 'right' }}>
            {note}
          </Text>
        ) : null}
      </View>
    </View>
  )
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {row}
    </Pressable>
  ) : (
    row
  )
}
