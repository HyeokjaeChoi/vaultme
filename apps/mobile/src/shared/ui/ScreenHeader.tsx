// Figma: Icon button 67:205 (back, Icon / navigation / back 137:161) + Product / Title
import { View } from 'react-native'
import { useTheme } from '../theme'
import { IconButton } from './IconButton'
import { Text } from './Text'

/** In-screen header for pushed screens: 44 px back button and Title (24/600). Used with the native header hidden. */
export function ScreenHeader({ title, backLabel, onBack }: { title: string; backLabel: string; onBack: () => void }) {
  const t = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.primitive.space[1] }}>
      <IconButton icon="back" label={backLabel} onPress={onBack} />
      <Text variant="title" accessibilityRole="header" style={{ flex: 1 }}>{title}</Text>
    </View>
  )
}
