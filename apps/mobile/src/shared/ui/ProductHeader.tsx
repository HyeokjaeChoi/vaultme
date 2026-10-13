// Figma: Product header 68:167 (Icon / account 137:41, Icon / Asset / ETH 137:402, account details control 80:343)
import { Pressable, View } from 'react-native'
import { useTheme } from '../theme'
import { AssetIcon, type AssetSymbol } from './AssetIcon'
import { Icon } from './Icon'
import { Text } from './Text'

type Props = { title: string; subtitle?: string; networkSymbol?: AssetSymbol; detailsLabel: string; onDetails?: () => void }

/** C22 Product header: account + network on the left, 44 px details control on the right. No background (sits on canvas). */
export function ProductHeader({ title, subtitle, networkSymbol = 'ETH', detailsLabel, onDetails }: Props) {
  const t = useTheme()
  const gap = t.semantic.layout.fieldGap
  const ic = t.component.icon
  return (
    <View style={{ minHeight: t.component.productHeader.height.mobile, flexDirection: 'row', alignItems: 'center', gap }}>
      <View accessible accessibilityRole="header" accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title} style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
          <Icon name="account" size={ic.account.size} color={ic.account.fg} />
          <Text variant="section" style={{ flex: 1 }}>{title}</Text>
        </View>
        {subtitle ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
            <AssetIcon symbol={networkSymbol} size={ic.network.size} />
            <Text variant="body" color={t.semantic.text.secondary} style={{ flex: 1 }}>{subtitle}</Text>
          </View>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={detailsLabel}
        onPress={onDetails}
        style={{ width: t.component.iconButton.hitTarget, height: t.component.iconButton.hitTarget, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="more" size={t.component.iconButton.iconSize} color={t.component.iconButton.fg} />
      </Pressable>
    </View>
  )
}
