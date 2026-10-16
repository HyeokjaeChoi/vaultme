// Figma: Status notice 73:169 (Notice / Danger 85:4277, Clear 85:3520, Info 305:82); Redesign B: B/Notice inline
import type { ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { useTheme } from '../theme'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

export type Tone = 'info' | 'warning' | 'danger' | 'unknown' | 'confirmed' | 'clear'
const ICON: Record<Tone, IconName> = { info: 'info', warning: 'warning', danger: 'danger', unknown: 'unknown', confirmed: 'confirmed', clear: 'clear' }

type Props = { tone: Tone; title: string; body?: ReactNode; /** Inline action under the text, e.g. "다시 확인". */ link?: { label: string; onPress: () => void } }

/** C25 Status notice (Redesign B inline, 399:122). No box, no tint, no border. Only the 20 pt icon carries the tone color; title is text/primary; body is text/secondary, or text/primary for warning and danger (Body Small, Figma 423:14763, 423:16236). Never color alone (icon + words). */
export function StatusNotice({ tone, title, body, link }: Props) {
  const t = useTheme()
  const c = t.component.statusNotice
  return (
    <View
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      accessible={!link}
      accessibilityLabel={typeof body === 'string' ? `${title}. ${body}` : title}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: c.gap, paddingVertical: t.primitive.space[2] }}
    >
      <Icon name={ICON[tone]} size={t.component.icon.size.control} color={c[tone].fg} />
      <View style={{ flex: 1, gap: t.primitive.space[1] }}>
        <Text variant="bodySmall" color={t.semantic.text.primary}>{title}</Text>
        {typeof body === 'string' ? <Text variant="bodySmall" color={tone === 'warning' || tone === 'danger' ? t.semantic.text.primary : t.semantic.text.secondary}>{body}</Text> : body}
        {link ? (
          <Pressable accessibilityRole="link" accessibilityLabel={link.label} onPress={link.onPress} style={{ minHeight: t.primitive.size.touch_min, justifyContent: 'center' }}>
            <Text variant="label" color={t.semantic.text.link}>{link.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}
