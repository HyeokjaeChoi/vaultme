// Figma: Link row "테스트 ETH 받기" (Flow 1 empty Home 486:77 area, B-S30 faucet, 2026-10-17; List item 300:642 with Value + external icon 520:27859)
import { Linking, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useCopy } from '@/shared/lib/useCopy'
import { useTheme } from '@/shared/theme'
import { ListItem, Text } from '@/shared/ui'

// Chosen from the official pages on 2026-10-17: no account, no mainnet balance (outputs/design/ux-copy.md "Faucet 조사"). VaultMe does not run it.
export const FAUCET_URL = 'https://faucet.quicknode.com/ethereum/sepolia'

/** "테스트 ETH 받기 · QuickNode ↗" with its caption. Tap = copy the receive address (copy feedback), then open the faucet in the browser. Shown only after backup (the address is hidden before, Q14). */
export function FaucetRow({ address }: { address: string }) {
  const { t } = useTranslation()
  const th = useTheme()
  const { copy } = useCopy(t('receive.copied'))
  return (
    <View style={{ gap: th.primitive.space[1] }}>
      <ListItem
        title={t('home.faucet.title')}
        trailing={{ kind: 'external', text: t('home.faucet.value') }}
        onPress={() => {
          void copy(address)
          void Linking.openURL(FAUCET_URL).catch(() => undefined)
        }}
      />
      <Text variant="caption" color={th.semantic.text.secondary}>{t('home.faucet.caption')}</Text>
    </View>
  )
}
