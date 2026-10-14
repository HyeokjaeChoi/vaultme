// Figma: Nav row (R-S20A 334:327) with Icon button / Plain 330:3401 (back, Icon / navigation / back 137:161)
import { View } from 'react-native'
import { useTheme } from '../theme'
import { IconButton } from './IconButton'

/** Nav row of a pushed screen: bare 44 px back button at the left (pl space-2). The page title is a Title text in the body, not here. Used with the native header hidden; edge-swipe back stays native. */
export function ScreenHeader({ backLabel, onBack }: { backLabel: string; onBack: () => void }) {
  const t = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: t.primitive.space[2] }}>
      <IconButton icon="back" variant="plain" label={backLabel} onPress={onBack} />
    </View>
  )
}
