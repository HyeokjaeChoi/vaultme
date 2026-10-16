// Figma: B-S41 Nav 423:16340; Nav row (R-S20A 334:327) with Icon button / Plain 330:3401 (back, Icon / navigation / back 137:161)
import { View } from 'react-native'
import { useTheme } from '../theme'
import { IconButton } from './IconButton'
import { Text } from './Text'

/** Nav row of a pushed screen: bare 44 px back button at the left (pl space-2). `title` (Title 3) sits right of the back button, as on B-S41 423:16327; other screens put the title in the body. Used with the native header hidden; edge-swipe back stays native. */
export function ScreenHeader({ backLabel, onBack, title }: { backLabel: string; onBack: () => void; title?: string }) {
  const t = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: t.primitive.space[2] }}>
      <IconButton icon="back" variant="plain" label={backLabel} onPress={onBack} />
      {title ? <Text variant="title3" accessibilityRole="header" style={{ flex: 1, paddingHorizontal: t.primitive.space[2] }}>{title}</Text> : null}
    </View>
  )
}
