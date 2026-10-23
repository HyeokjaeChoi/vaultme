// Figma: B/Section header 399:95
import { Pressable, View } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

type Props = { title: string; link?: string; onLinkPress?: () => void }

/** Section header: Title 2 with an optional trailing link (Label, text/link, 44 pt target). paddingX 0, the screen pads. */
export function SectionHeader({ title, link, onLinkPress }: Props) {
  const t = useTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.semantic.layout.fieldGap,
        paddingTop: t.semantic.layout.groupGap,
        paddingBottom: t.semantic.layout.fieldGap,
      }}
    >
      <Text variant="title2" accessibilityRole="header" style={{ flex: 1 }}>
        {title}
      </Text>
      {link ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={link}
          onPress={onLinkPress}
          style={{ minHeight: t.primitive.size.touch_min, justifyContent: 'center' }}
        >
          <Text variant="link" color={t.semantic.text.link}>
            {link}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}
