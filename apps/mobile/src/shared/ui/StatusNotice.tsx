// Figma: Status notice 73:169 (Notice / Danger 85:4277, Clear 85:3520, Info 305:82); Redesign B: B/Notice inline
import type { ReactNode } from 'react'
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

export type Tone = 'info' | 'warning' | 'danger' | 'unknown' | 'confirmed' | 'clear'
const ICON: Record<Tone, IconName> = { info: 'info', warning: 'warning', danger: 'danger', unknown: 'unknown', confirmed: 'confirmed', clear: 'clear' }

type Props = { tone: Tone; title: string; body?: ReactNode }

/** C25 Status notice (Redesign B inline). No box, no tint, no border: 20 pt icon + Label title in the tone color, Body Small text/secondary below. Never color alone (icon + words). */
export function StatusNotice({ tone, title, body }: Props) {
  const t = useTheme()
  const c = t.component.statusNotice
  const fg = c[tone].fg
  return (
    <View
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      accessible
      accessibilityLabel={typeof body === 'string' ? `${title}. ${body}` : title}
      style={{ gap: c.gap, paddingVertical: t.primitive.space[2] }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: c.gap }}>
        <Icon name={ICON[tone]} size={t.component.icon.size.control} color={fg} />
        <Text variant="label" color={fg} style={{ flex: 1 }}>{title}</Text>
      </View>
      {typeof body === 'string' ? <Text variant="bodySmall" color={t.semantic.text.secondary}>{body}</Text> : body}
    </View>
  )
}
