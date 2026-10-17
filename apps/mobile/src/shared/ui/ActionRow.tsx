// Figma: B/Action row 399:140 (Button / Primary 399:141, Button / Secondary 399:148); empty wallet S10E 515:29238
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Button } from './Button'
import type { IconName } from './Icon'

type Action = { label: string; onPress?: () => void; icon?: IconName }

/**
 * Two md buttons side by side. Positions are fixed: Send on the left, Receive on the right (owner 2026-10-17).
 * `primary` says which one is Primary (blue); the other is Secondary. Send by default. An empty wallet has nothing to send, so Receive is Primary there.
 */
export function ActionRow({ send, receive, primary = 'send' }: { send: Action; receive: Action; primary?: 'send' | 'receive' }) {
  const t = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: t.semantic.layout.rowGap, paddingVertical: t.semantic.layout.groupGap }}>
      <Button size="md" variant={primary === 'send' ? 'primary' : 'secondary'} style={{ flex: 1 }} {...send} />
      <Button size="md" variant={primary === 'receive' ? 'primary' : 'secondary'} style={{ flex: 1 }} {...receive} />
    </View>
  )
}
