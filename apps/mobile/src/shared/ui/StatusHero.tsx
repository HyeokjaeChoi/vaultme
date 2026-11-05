// Figma: B/Status hero 422:667 (Tone Pending / Confirmed / Failed / Unknown / Replaced; Bold Duotone hero icons 506:26156 / 506:26142 / 506:26149 / 506:26163; Replaced keeps refresh 137:350)
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Icon } from './Icon'
import { Text } from './Text'

export type HeroTone = 'pending' | 'confirmed' | 'failed' | 'unknown' | 'replaced'

/** Result headline: 48 pt Bold Duotone status icon, Title 1, Body in text/secondary. Replaced uses the refresh icon in the warning color (Figma). */
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
      {tone === 'replaced' ? (
        <Icon name="refresh" size={t.primitive.size.avatar_lg} color={color} />
      ) : (
        <Icon name={tone} weight="duotone" size={t.primitive.size.avatar_lg} color={color} />
      )}
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
