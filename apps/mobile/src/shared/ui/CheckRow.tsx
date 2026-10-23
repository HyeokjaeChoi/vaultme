// Figma: B/Check row 515:27570 (State=Off / On, Title, Body, Show body)
import { Pressable, View } from 'react-native'
import { useTheme } from '../theme'
import { Icon } from './Icon'
import { Text } from './Text'

type Props = { title: string; body?: string; checked: boolean; onToggle: () => void }

/** Acknowledgement row (S02 x3, S03 x1). Off = border/strong box (a selection control, so a functional border), On = action primary box + white check. The whole row is the 44 pt+ target. */
export function CheckRow({ title, body, checked, onToggle }: Props) {
  const t = useTheme()
  const box = t.primitive.size.icon_lg
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={body ? `${title}. ${body}` : title}
      onPress={onToggle}
      style={{
        minHeight: t.primitive.size.touch_min,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: t.semantic.layout.rowGap,
        paddingVertical: t.primitive.space[2],
      }}
    >
      <View
        style={{
          width: box,
          height: box,
          borderRadius: t.primitive.radius.sm,
          borderWidth: checked ? 0 : t.primitive.borderWidth.strong,
          borderColor: t.semantic.border.strong,
          backgroundColor: checked ? t.component.buttonB.primary.bg : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? (
          <Icon name="check" size={t.component.icon.size.control} color={t.component.icon.action.onPrimary} />
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="headline">{title}</Text>
        {body ? (
          <Text variant="bodySmall" color={t.semantic.text.secondary}>
            {body}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}
