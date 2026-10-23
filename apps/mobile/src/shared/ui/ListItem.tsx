// Figma: List item 300:642 (Icon / navigation / forward 137:196); Redesign B: B/Settings row 426:2045, B/Switch row 422:699
import type { ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { useTheme } from '../theme'
import { usePressScale } from '../theme/motion'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

type Props = {
  title: string
  /** Leading Solar Linear icon (settings rows, 20 pt, icon.action.fg). */
  icon?: IconName
  /** Leading icon color override (the version row's info icon uses the info status color). */
  iconColor?: string
  /** Label in Product B / Address (mono), for a recent address. */
  mono?: boolean
  /** 52 pt row (S64 license list, Figma 526:54525) instead of 64. */
  compact?: boolean
  /** The trailing value is a Fact (Product B/Fact mono): network + chainId, version. */
  factValue?: boolean
  /** `value` = text only, `disclosure` = optional value + chevron, `external` = optional value + the open-in-browser icon (link row), `custom` = any node, e.g. a Switch (Switch row). */
  trailing?:
    | { kind: 'value'; text: string }
    | { kind: 'disclosure'; text?: string }
    | { kind: 'external'; text?: string }
    | { kind: 'custom'; node: ReactNode }
  onPress?: () => void
}

/** C31 List item (Redesign B Settings row / Switch row). Flat, no fill and no divider, min-height rowB.height 64, title Row title 500, trailing value Body Small tertiary (Caption on a compact license row), 20 pt chevron. A pressable row scales to 0.97 over 100 ms. */
export function ListItem({ title, icon, iconColor, mono, compact, factValue, trailing, onPress }: Props) {
  const t = useTheme()
  const { style, handlers } = usePressScale()
  const value = (text: string) => (
    <Text
      variant={factValue ? 'fact' : compact ? 'caption' : 'bodySmall'}
      color={factValue ? t.semantic.text.secondary : t.semantic.text.tertiary}
      tabular
    >
      {text}
    </Text>
  )
  const row = (
    <View
      style={{
        minHeight: compact ? t.primitive.size.control_lg : t.component.rowB.height,
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.semantic.layout.rowGap,
      }}
    >
      {icon ? (
        <Icon name={icon} size={t.component.icon.size.control} color={iconColor ?? t.component.icon.action.fg} />
      ) : null}
      <Text variant={mono ? 'address' : 'rowTitle'} color={t.component.listItem.label} style={{ flex: 1 }}>
        {title}
      </Text>
      {trailing?.kind === 'value' ? value(trailing.text) : null}
      {trailing?.kind === 'disclosure' ? (
        <>
          {trailing.text ? value(trailing.text) : null}
          <Icon name="disclosure" size={t.component.icon.size.control} color={t.component.listItem.icon} />
        </>
      ) : null}
      {trailing?.kind === 'external' ? (
        <>
          {trailing.text ? (
            <Text variant="bodySmall" color={t.semantic.text.tertiary}>
              {trailing.text}
            </Text>
          ) : null}
          <Icon name="external" size={t.component.icon.size.control} color={t.component.listItem.icon} />
        </>
      ) : null}
      {trailing?.kind === 'custom' ? trailing.node : null}
    </View>
  )
  return onPress ? (
    <Animated.View style={style}>
      <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} {...handlers}>
        {row}
      </Pressable>
    </Animated.View>
  ) : (
    row
  )
}
