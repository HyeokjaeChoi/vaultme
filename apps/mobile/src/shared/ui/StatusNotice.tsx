// Figma: Status notice 73:169 (Notice / Danger 85:4277, Clear 85:3520, Info 305:82)
import type { ReactNode } from 'react'
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

export type Tone = 'info' | 'warning' | 'danger' | 'unknown' | 'confirmed' | 'clear'
const ICON: Record<Tone, IconName> = { info: 'info', warning: 'warning', danger: 'danger', unknown: 'unknown', confirmed: 'confirmed', clear: 'clear' }

type Props = { tone: Tone; title: string; body?: ReactNode }

/** C25 Status notice. Tint surface, padding layout.rowGap (12), group radius, icon + Label title + Body text in the tone foreground. Never color alone. */
export function StatusNotice({ tone, title, body }: Props) {
  const t = useTheme()
  const c = t.component.statusNotice
  const s = c[tone]
  return (
    <View
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      accessible
      focusable={false} // Android: no grey keyboard-focus highlight on a read-only row
      accessibilityLabel={typeof body === 'string' ? `${title}. ${body}` : title}
      style={{ gap: c.gap, padding: t.semantic.layout.rowGap, borderRadius: t.semantic.shape.group, backgroundColor: s.bg, borderWidth: s.borderWidth, borderColor: s.border }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: c.gap }}>
        <Icon name={ICON[tone]} size={t.component.icon.size.control} color={s.fg} />
        <Text variant="label" color={s.fg} style={{ flex: 1 }}>{title}</Text>
      </View>
      {typeof body === 'string' ? <Text variant="body" color={s.fg}>{body}</Text> : body}
    </View>
  )
}
