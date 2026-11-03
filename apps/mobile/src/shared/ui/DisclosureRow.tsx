// Figma: B/Settings row 426:2045 as the "자세히" row (Title Product B/Label; Icon / navigation / expand 565:73591, collapse 565:73595)
import { Pressable } from 'react-native'
import { useTheme } from '../theme'
import { Icon } from './Icon'
import { Text } from './Text'

type Props = { title: string; expanded: boolean; onToggle: () => void }

/** A row that shows or hides more rows under it. Announces its state (role button, expanded). */
export function DisclosureRow({ title, expanded, onToggle }: Props) {
  const t = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ expanded }}
      onPress={onToggle}
      style={{
        minHeight: t.component.rowB.height,
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.semantic.layout.rowGap,
      }}
    >
      <Text variant="label" style={{ flex: 1 }}>
        {title}
      </Text>
      <Icon
        name={expanded ? 'collapse' : 'expand'}
        size={t.component.icon.size.control}
        color={t.component.icon.action.fg}
      />
    </Pressable>
  )
}
