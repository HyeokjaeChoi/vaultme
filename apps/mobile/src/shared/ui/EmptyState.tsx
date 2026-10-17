// Figma: B/Empty state 422:674 (Icon / hero / receive 506:26134, cloud-cross 541:238, shield-warning 533:21900; Bold Duotone 48)
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Button } from './Button'
import { Icon, type BoldIconName, type HeroIconName } from './Icon'
import { Text } from './Text'

type Props = { title: string; body: string; icon?: HeroIconName; /** `bold` draws a Solar Bold status icon (name from the bold set) instead of the Duotone hero: camera denied uses Icon / status / warning / bold (Figma 506:24521). */ bold?: BoldIconName; /** Hero color: `brand` = neutral grey (receive; accent rule: blue is only for actions), `warning` (error, backup needed). */ tone?: 'brand' | 'warning'; action?: { label: string; onPress?: () => void } }

/** Empty or error state: 48 pt Bold Duotone hero (same role color, back layer 50%), Title 3, Body, optional Primary md pill. Centered. */
export function EmptyState({ title, body, icon = 'receive', bold, tone = 'brand', action }: Props) {
  const t = useTheme()
  const c = t.component.emptyState
  const color = tone === 'warning' ? t.component.icon.status.warning : t.semantic.icon.tertiary
  return (
    <View style={{ alignItems: 'center', gap: t.primitive.space[3], padding: c.padding }}>
      {bold ? <Icon name={bold} weight="bold" size={t.primitive.size.avatar_lg} color={color} /> : <Icon name={icon} weight="duotone" size={t.primitive.size.avatar_lg} color={color} />}
      <Text variant="title3" color={c.title} style={{ textAlign: 'center' }}>{title}</Text>
      <Text variant="body" color={c.body} style={{ textAlign: 'center' }}>{body}</Text>
      {action ? <Button size="md" label={action.label} {...(action.onPress ? { onPress: action.onPress } : {})} /> : null}
    </View>
  )
}
