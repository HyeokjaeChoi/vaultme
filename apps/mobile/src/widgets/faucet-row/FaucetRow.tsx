// Figma: Faucet action 586:100428 (empty Home block, frame 515:29238); Link row "테스트 ETH 받기" (Flow 1 empty Home 486:77 area, B-S30 faucet, 2026-10-17; List item 300:642 with Value + external icon 520:27859)
import { Linking, Pressable, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useCopy } from '@/shared/lib/useCopy'
import { useTheme } from '@/shared/theme'
import { Icon, ListItem, Text } from '@/shared/ui'

// Chosen from the official pages on 2026-10-17: no account, no mainnet balance (outputs/design/ux-copy.md "Faucet 조사"). VaultMe does not run it.
export const FAUCET_URL = 'https://faucet.quicknode.com/ethereum/sepolia'

/** Empty Home: one tappable block (icon tile, title, Body Small reason, external icon), left aligned. Same action as the row below. */
export function FaucetAction({ address }: { address: string }) {
  const { t } = useTranslation()
  const th = useTheme()
  const { copy } = useCopy(t('receive.copied'))
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('home.faucet.title')}. ${t('home.faucet.caption')}`}
      onPress={() => {
        void copy(address)
        void Linking.openURL(FAUCET_URL).catch(() => undefined)
      }}
      style={{ marginTop: th.semantic.layout.groupGap, flexDirection: 'row', alignItems: 'center', gap: th.semantic.layout.rowGap, padding: th.primitive.space[4], borderRadius: th.primitive.radius.lg, backgroundColor: th.semantic.surface.pressed }}
    >
      <View style={{ width: th.primitive.size.control_md, height: th.primitive.size.control_md, borderRadius: th.primitive.radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: th.semantic.surface.default }}>
        <Icon name="receive" size={th.component.icon.size.control} color={th.component.icon.action.fg} />
      </View>
      <View style={{ flex: 1, gap: th.primitive.space[1] }}>
        <Text variant="rowTitle">{t('home.faucet.title')}</Text>
        <Text variant="bodySmall" color={th.semantic.text.secondary}>{t('home.faucet.caption')}</Text>
      </View>
      <Icon name="external" size={th.component.icon.size.control} color={th.component.listItem.icon} />
    </Pressable>
  )
}

/** "테스트 ETH 받기 · QuickNode ↗" with its caption. Tap = copy the receive address (copy feedback), then open the faucet in the browser. Shown only after backup (the address is hidden before, Q14). */
export function FaucetRow({ address, inFooter, bare }: { address: string; /** S30: the first block of the footer stack (Figma 555:72569): 8 above, side padding 16, 52 high row. */ inFooter?: boolean; /** USDC fee shortage (Figma B-S20b / B-S22U "Link 테스트 ETH 받기" 618:106280): the row alone, no caption. */ bare?: boolean }) {
  const { t } = useTranslation()
  const th = useTheme()
  const { copy } = useCopy(t('receive.copied'))
  return (
    <View style={{ gap: th.primitive.space[1], ...(inFooter ? { paddingTop: th.primitive.space[2], paddingHorizontal: th.semantic.layout.screen.padding } : {}) }}>
      <ListItem
        compact={!!inFooter || !!bare}
        title={t('home.faucet.title')}
        trailing={{ kind: 'external', text: t('home.faucet.value') }}
        onPress={() => {
          void copy(address)
          void Linking.openURL(FAUCET_URL).catch(() => undefined)
        }}
      />
      {bare ? null : <Text variant="caption" color={th.semantic.text.secondary}>{t('home.faucet.caption')}</Text>}
    </View>
  )
}
