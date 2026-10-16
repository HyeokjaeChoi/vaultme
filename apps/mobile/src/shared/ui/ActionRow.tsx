// Figma: B/Action row 399:140 (Button / Primary 399:141, Button / Secondary 399:148)
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Button } from './Button'
import type { IconName } from './Icon'

type Action = { label: string; onPress?: () => void; icon?: IconName }

/** Two md buttons side by side: Primary (send) and Secondary (receive). One Primary per screen. */
export function ActionRow({ primary, secondary }: { primary: Action; secondary: Action }) {
  const t = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: t.semantic.layout.rowGap, paddingVertical: t.semantic.layout.groupGap }}>
      <Button size="md" style={{ flex: 1 }} {...primary} />
      <Button size="md" variant="secondary" style={{ flex: 1 }} {...secondary} />
    </View>
  )
}
