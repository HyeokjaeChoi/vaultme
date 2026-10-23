// Figma: B/Status hero 422:667 (Tone Pending / Confirmed / Failed / Unknown / Replaced; icons 137:58 / 137:75 / 137:110 / 137:127 / 137:350)
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

export type HeroTone = 'pending' | 'confirmed' | 'failed' | 'unknown' | 'replaced'
const ICON: Record<HeroTone, IconName> = {
  pending: 'pending',
  confirmed: 'confirmed',
  failed: 'failed',
  unknown: 'unknown',
  replaced: 'refresh',
}

/** Result headline: 48 pt status icon, Title 1, Body in text/secondary. Replaced uses the refresh icon in the warning color (Figma). */
export function StatusHero({ tone, title, body }: { tone: HeroTone; title: string; body?: string }) {
  const t = useTheme()
  const s = t.component.icon.status
  const color = tone === 'replaced' ? s.warning : s[tone]
  return (
    <View
      accessible
      accessibilityLabel={body ? `${title}. ${body}` : title}
      style={{
        gap: t.semantic.layout.groupGap,
        paddingTop: t.primitive.space[10],
        paddingBottom: t.semantic.layout.groupGap,
      }}
    >
      <Icon name={ICON[tone]} size={t.primitive.size.avatar_lg} color={color} />
      <Text variant="title1" accessibilityRole="header">
        {title}
      </Text>
      {body ? (
        <Text variant="body" color={t.semantic.text.secondary}>
          {body}
        </Text>
      ) : null}
    </View>
  )
}
