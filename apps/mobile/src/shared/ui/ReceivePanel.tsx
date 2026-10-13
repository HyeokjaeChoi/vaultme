// Figma: Receive address 68:150 (Button / Copy address 80:319)
import { View } from 'react-native'
import { useTheme } from '../theme'
import { AddressText } from './AddressBlock'
import { Button } from './Button'
import { Text } from './Text'

type Props = { title: string; account: string; network: string; address: string; copyLabel: string; note: string; onCopy?: () => void }

/** C07 Receive address: title, account, network, full address in 4-char groups, Secondary copy button and the network warning line. */
export function ReceivePanel({ title, account, network, address, copyLabel, note, onCopy }: Props) {
  const t = useTheme()
  const c = t.component.receivePanel
  return (
    <View style={{ gap: t.semantic.layout.fieldGap, borderRadius: c.radius, borderWidth: c.borderWidth }}>
      <Text variant="title" color={c.title} accessibilityRole="header">{title}</Text>
      <Text variant="row">{account}</Text>
      <Text variant="body" color={c.helper}>{network}</Text>
      <AddressText address={address} color={c.address} />
      <Button label={copyLabel} variant="secondary" {...(onCopy ? { onPress: onCopy } : {})} />
      <Text variant="body" color={c.helper}>{note}</Text>
    </View>
  )
}
