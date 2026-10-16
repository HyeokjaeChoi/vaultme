// Figma: List item 300:642 (Icon / navigation / forward 137:196); Redesign B: B/Settings row 426:2045, B/Switch row 422:699
import type { ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { useTheme } from '../theme'
import { usePressScale } from '../theme/motion'
import { Icon } from './Icon'
import { Text } from './Text'

type Props = {
  title: string
  /** Label in Product B / Address (mono), for a recent address. */
  mono?: boolean
  /** `value` = text only, `disclosure` = optional value + chevron, `custom` = any node, e.g. a Switch (Switch row). */
  trailing?: { kind: 'value'; text: string } | { kind: 'disclosure'; text?: string } | { kind: 'custom'; node: ReactNode }
  onPress?: () => void
}

/** C31 List item (Redesign B Settings row / Switch row). Flat, no fill and no divider, min-height rowB.height 64, title Headline, trailing value Body Small tertiary, 20 pt chevron. A pressable row scales to 0.97 over 100 ms. */
export function ListItem({ title, mono, trailing, onPress }: Props) {
  const t = useTheme()
  const { style, handlers } = usePressScale()
  const value = (text: string) => <Text variant="bodySmall" color={t.semantic.text.tertiary} tabular>{text}</Text>
  const row = (
    <View style={{ minHeight: t.component.rowB.height, flexDirection: 'row', alignItems: 'center', gap: t.semantic.layout.rowGap }}>
      <Text variant={mono ? 'address' : 'headline'} color={t.component.listItem.label} style={{ flex: 1 }}>{title}</Text>
      {trailing?.kind === 'value' ? value(trailing.text) : null}
      {trailing?.kind === 'disclosure' ? (
        <>
          {trailing.text ? value(trailing.text) : null}
          <Icon name="disclosure" size={t.component.icon.size.control} color={t.component.listItem.icon} />
        </>
      ) : null}
      {trailing?.kind === 'custom' ? trailing.node : null}
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
