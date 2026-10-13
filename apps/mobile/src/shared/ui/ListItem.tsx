// Figma: List item 300:642 (Icon / navigation / forward 137:196)
import type { ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { useTheme } from '../theme'
import { usePressScale } from '../theme/motion'
import { Icon } from './Icon'
import { Text } from './Text'

type Props = {
  title: string
  /** Label in Product / Address (mono), for a recent address. */
  mono?: boolean
  trailing?: { kind: 'value'; text: string } | { kind: 'disclosure'; text?: string } | { kind: 'custom'; node: ReactNode }
  divider?: boolean
  onPress?: () => void
}

/** C31 List item. White row, min-height 52, label Row 16/500, trailing value (Meta 12/500), disclosure caret or switch; 1 px divider only when asked. A pressable row scales to 0.97 over 160 ms. */
export function ListItem({ title, mono, trailing, divider, onPress }: Props) {
  const t = useTheme()
  const { style, handlers } = usePressScale()
  const row = (
    <View style={{ backgroundColor: t.semantic.surface.default }}>
      <View
        style={{
          minHeight: t.primitive.size.control_lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.semantic.layout.rowGap,
          paddingHorizontal: t.semantic.layout.screen.padding,
          paddingVertical: t.semantic.layout.rowGap,
        }}
      >
        <Text variant={mono ? 'address' : 'row'} style={{ flex: 1 }}>{title}</Text>
        {trailing?.kind === 'value' ? <Text variant="meta" color={t.semantic.text.secondary}>{trailing.text}</Text> : null}
        {trailing?.kind === 'disclosure' ? (
          <>
            {trailing.text ? <Text variant="meta" color={t.semantic.text.secondary}>{trailing.text}</Text> : null}
            <Icon name="disclosure" size={t.component.icon.size.control} color={t.semantic.icon.secondary} />
          </>
        ) : null}
        {trailing?.kind === 'custom' ? trailing.node : null}
      </View>
      {divider ? <View style={{ height: t.primitive.borderWidth.hairline, backgroundColor: t.semantic.border.subtle }} /> : null}
    </View>
  )
  return onPress ? (
    <Animated.View style={style}>
      <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} {...handlers}>{row}</Pressable>
    </Animated.View>
  ) : (
    row
  )
}
