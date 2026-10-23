// Figma: B-S22 Nav 494:19514 (Chips 494:19511); Nav row (R-S20A 334:327) with Icon button / Plain 330:3401 (back, Icon / navigation / back 137:161)
import type { ReactNode } from 'react'
import { View } from 'react-native'
import { useTheme } from '../theme'
import { IconButton } from './IconButton'
import type { IconName } from './Icon'
import { Text } from './Text'

type Props = {
  backLabel?: string
  onBack?: () => void
  /** Title (Title 2, left, right of the back button), for screens that keep it (asset detail). */ title?: string
  /** The honesty chips (Sepolia 테스트넷, 테스트 데이터) at the right. */ chips?: ReactNode
  /** Leading icon: `back` (default) or `close` for a screen that opens over the flow (QR scan, Figma 618:102956). */ icon?: IconName
  /** Leading icon color, for a dark surface. */ iconColor?: string
}

/** Nav row of a pushed screen: bare 44 pt back button at the left (pl space-1.5), status chips at the right (pr screen padding). Without `onBack` only the chips show (result screens). Used with the native header hidden; edge-swipe back stays native. */
export function ScreenHeader({ backLabel, onBack, title, chips, icon = 'back', iconColor }: Props) {
  const t = useTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: t.primitive.size.touch_min,
        gap: t.primitive.space[2],
        paddingLeft: t.primitive.space['1_5'],
        paddingRight: t.semantic.layout.screen.padding,
      }}
    >
      {onBack ? (
        <IconButton
          icon={icon}
          variant="plain"
          label={backLabel ?? ''}
          onPress={onBack}
          {...(iconColor ? { color: iconColor } : {})}
        />
      ) : (
        <View />
      )}
      {title ? (
        <Text variant="title2" accessibilityRole="header" style={{ flex: 1 }}>
          {title}
        </Text>
      ) : null}
      {chips ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.primitive.space['1_5'] }}>{chips}</View>
      ) : null}
    </View>
  )
}
