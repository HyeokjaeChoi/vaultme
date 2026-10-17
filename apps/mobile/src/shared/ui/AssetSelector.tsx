// Figma: Asset selector 618:102370 (Asset row 618:102371 + Icon / navigation / expand 565:73591)
import { Pressable, View } from 'react-native'
import { useTheme } from '../theme'
import { AssetIcon, type AssetSymbol } from './AssetIcon'
import { Icon } from './Icon'
import { Text } from './Text'

type Props = { name: string; symbol: AssetSymbol; /** Accessible hint, e.g. "보낼 자산". */ label: string; onPress: () => void }

/** Asset selector on the amount screen: 64 pt row (40 pt asset icon, name Row title, symbol Caption tertiary) and a 20 pt expand chevron. Tap opens the asset sheet. */
export function AssetSelector({ name, symbol, label, onPress }: Props) {
  const t = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${name}`}
      accessibilityHint={symbol}
      onPress={onPress}
      style={{ minHeight: t.component.rowB.height, flexDirection: 'row', alignItems: 'center', gap: t.semantic.layout.rowGap }}
    >
      <View style={{ width: t.primitive.size.avatar_md, height: t.primitive.size.avatar_md, alignItems: 'center', justifyContent: 'center' }}>
        <AssetIcon symbol={symbol} size={t.primitive.size.avatar_md} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="rowTitle">{name}</Text>
        <Text variant="caption" color={t.semantic.text.tertiary}>{symbol}</Text>
      </View>
      <Icon name="expand" size={t.component.icon.size.control} color={t.component.icon.action.fg} />
    </Pressable>
  )
}
