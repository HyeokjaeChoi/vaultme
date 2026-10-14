// Figma: Collection state 377:2196 (Loading 377:2256, Empty 377:2301; Error is a StatusNotice + Button on the screen)
import type { ReactNode } from 'react'
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Icon } from './Icon'
import { Text } from './Text'

const SKELETON_ROWS = 3

type Props = { state: 'loading'; title: string } | { state: 'empty'; title: string; body: string; action: ReactNode }

/** C27 Collection state: loading = a status line over skeleton rows, empty = wallet icon, title, body and one action. Unknown is never drawn as zero. */
export function CollectionState(p: Props) {
  const t = useTheme()
  const sk = t.component.skeleton
  const es = t.component.emptyState
  return (
    <View style={{ gap: t.semantic.layout.fieldGap, paddingVertical: t.semantic.layout.screen.padding }}>
      {p.state === 'empty' ? <Icon name="wallet" size={t.component.icon.size.control} color={es.title} /> : null}
      <Text variant="section" color={es.title} accessibilityRole="header" accessibilityLiveRegion={p.state === 'loading' ? 'polite' : undefined}>{p.title}</Text>
      {p.state === 'loading' ? (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ gap: t.semantic.layout.fieldGap }}>
          {Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <View key={i} style={{ height: sk.rowMinHeight, borderRadius: sk.radius, backgroundColor: sk.bg }} />
          ))}
        </View>
      ) : (
        <>
          <Text variant="body" color={es.body}>{p.body}</Text>
          {p.action}
        </>
      )}
    </View>
  )
}
