// Figma: B/Notice inline 399:122 (Tier=Inline | Banner, Tone, Title + Show title; Status notice 73:169)
import type { ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { useTheme } from '../theme'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

type Tone = 'info' | 'warning' | 'danger' | 'unknown' | 'confirmed' | 'clear'
const ICON: Record<Tone, IconName> = {
  info: 'info',
  warning: 'warning',
  danger: 'danger',
  unknown: 'unknown',
  confirmed: 'confirmed',
  clear: 'clear',
}

type Props = {
  tone: Tone
  /** `inline` (default) = one helper line, no box. `banner` = a blocking situation: tinted box, radius 16, padding 16. */
  tier?: 'inline' | 'banner'
  /** Inline: the line of text. Banner: the Headline title (600). Empty banner title = message only (body), as the QR invalid notice (Figma 618:103186). */
  title: string
  /** Sheet heading style (B/Address compare 477:5145): Label in the tone color. */
  heading?: boolean
  body?: ReactNode
  /** Replaces the tone icon (e.g. the loader of a running re-check). */
  icon?: IconName
  /** Inline action under the text, e.g. "다시 확인". */
  link?: { label: string; onPress: () => void }
}

/**
 * C25 Notice, two tiers (owner decision 2026-10-17). Inline: icon (tone color) + Body Small, no box.
 * Banner: tint fill `noticeBanner.<tone>.bg`, icon + Headline title + Body Small message in text/secondary. Never color alone (icon + words).
 */
export function StatusNotice({ tone, tier = 'inline', title, heading, body, icon, link }: Props) {
  const t = useTheme()
  const c = t.component.statusNotice
  const banner = tier === 'banner'
  const b = t.component.noticeBanner
  const quiet = tone === 'info' || tone === 'unknown' || tone === 'clear'
  return (
    <View
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      accessible={!link}
      accessibilityLabel={typeof body === 'string' ? [title, body].filter(Boolean).join('. ') : title}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: c.gap,
        ...(banner
          ? { padding: b.padding, borderRadius: b.radius, backgroundColor: b[tone].bg }
          : { paddingVertical: t.primitive.space[2] }),
      }}
    >
      <Icon name={icon ?? ICON[tone]} size={banner ? b.iconSize : t.component.icon.size.control} color={c[tone].fg} />
      <View style={{ flex: 1, gap: t.primitive.space[1] }}>
        {title ? (
          <Text
            variant={banner ? 'headline' : heading ? 'label' : 'bodySmall'}
            color={heading ? c[tone].fg : banner || !quiet ? t.semantic.text.primary : t.semantic.text.secondary}
          >
            {title}
          </Text>
        ) : null}
        {typeof body === 'string' ? (
          <Text variant="bodySmall" color={banner || quiet ? t.semantic.text.secondary : t.semantic.text.primary}>
            {body}
          </Text>
        ) : (
          body
        )}
        {link ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={link.label}
            onPress={link.onPress}
            style={{ minHeight: t.primitive.size.touch_min, justifyContent: 'center' }}
          >
            <Text variant="link" color={t.semantic.text.link}>
              {link.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}
