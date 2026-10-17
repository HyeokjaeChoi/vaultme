// Figma: B/Asset picker list 618:101981 inside Bottom sheet 618:102432 (B-S20b+AST): two B/Row asset rows, ETH and USDC
import type { AssetId } from '@vaultme/wallet-core'
import { Pressable, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { assets } from '@/entities/asset/fixtures'
import { useTheme } from '@/shared/theme'
import { AssetIcon, BottomSheet, Text } from '@/shared/ui'

type Props = {
  visible: boolean
  onClose: () => void
  onPick: (asset: AssetId) => void
  /** Balance text per asset, already formatted for a list (2 decimals, floored), without the symbol. null = not known: the row shows "—". */
  balances: Record<AssetId, string | null>
  selected: AssetId
}

/** "어떤 자산을 보낼까요?" sheet: ETH and USDC rows (40 pt icon, name, symbol, balance in Headline). The row padding adds to the sheet padding, as in Figma (icon at x=32). No action buttons: a tap picks and closes. */
export function AssetPickerSheet({ visible, onClose, onPick, balances, selected }: Props) {
  const { t } = useTranslation()
  const th = useTheme()
  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('send.assetQuestion')}>
      <View>
        {assets.map((a) => (
          <Pressable
            key={a.symbol}
            accessibilityRole="button"
            accessibilityState={{ selected: a.symbol === selected }}
            accessibilityLabel={`${a.name}, ${balances[a.symbol] ?? '—'} ${a.symbol}`}
            onPress={() => onPick(a.symbol)}
            style={{ minHeight: th.component.rowB.height, flexDirection: 'row', alignItems: 'center', gap: th.semantic.layout.rowGap, paddingHorizontal: th.component.rowB.paddingX }}
          >
            <AssetIcon symbol={a.symbol} size={th.primitive.size.avatar_md} />
            <View style={{ flex: 1 }}>
              <Text variant="rowTitle">{a.name}</Text>
              <Text variant="caption" color={th.semantic.text.tertiary}>{a.symbol}</Text>
            </View>
            <Text variant="headline" tabular style={{ textAlign: 'right' }}>{balances[a.symbol] ?? '—'} {a.symbol}</Text>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  )
}
