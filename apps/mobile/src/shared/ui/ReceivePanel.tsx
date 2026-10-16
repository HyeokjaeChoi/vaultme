// Figma: Receive address 68:150 inside Address block 342:836
import { View } from 'react-native'
import { useTheme } from '../theme'
import { AddressText } from './AddressBlock'
import { Group } from './Group'
import { Text } from './Text'

type Props = { account: string; network: string; address: string; note: string }

/** C07 Receive address: one white group with account, network, full address in 4-char groups and the network warning line. Copy and Share are page actions, not part of this panel. */
export function ReceivePanel({ account, network, address, note }: Props) {
  const t = useTheme()
  const c = t.component.receivePanel
  return (
    <Group>
      <View style={{ gap: t.semantic.layout.fieldGap, paddingVertical: t.primitive.space[3] }}>
        <Text variant="headline">{account}</Text>
        <Text variant="body" color={c.helper}>{network}</Text>
        <AddressText address={address} color={c.address} />
        <Text variant="body" color={c.helper}>{note}</Text>
      </View>
    </Group>
  )
}
