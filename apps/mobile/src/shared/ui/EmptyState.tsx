// Figma: B/Empty state 422:674 (Icon / navigation / activity 137:299)
import type { ReactNode } from 'react'
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Button } from './Button'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

type Props = { title: string; body: string; icon?: IconName; action?: { label: string; onPress?: () => void }; children?: ReactNode }

/** Empty list state: 32 pt icon, Title 3, Body, optional Secondary md button. Centered, padding emptyState.padding. */
export function EmptyState({ title, body, icon = 'activity', action }: Props) {
  const t = useTheme()
  const c = t.component.emptyState
  return (
    <View style={{ alignItems: 'center', gap: t.primitive.space[3], padding: c.padding }}>
      <Icon name={icon} size={t.primitive.size.icon_xl} color={t.component.icon.navigation.fg} />
      <Text variant="title3" color={c.title} style={{ textAlign: 'center' }}>{title}</Text>
      <Text variant="body" color={c.body} style={{ textAlign: 'center' }}>{body}</Text>
      {action ? <Button size="md" variant="secondary" label={action.label} {...(action.onPress ? { onPress: action.onPress } : {})} /> : null}
    </View>
  )
}
