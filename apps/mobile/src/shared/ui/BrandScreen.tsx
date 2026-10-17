// Figma: Brand layout of B-S01 423:13440, B-S90 423:15412, B-S91 423:15443, B-S92 423:15474 (centered Brand block above the actions; Brand/Mark 495:17569)
import type { ReactNode } from 'react'
import { View } from 'react-native'
import { useTheme } from '../theme'
import { BrandMark } from './BrandMark'
import { Screen } from './Screen'
import { Text } from './Text'

type Props = {
  /** Replaces the mark (S92 draws a warning hero). */
  hero?: ReactNode
  title: string
  /** Body under the title, centered. Lines break with \n. */
  body?: string
  /** Pinned actions (buttons, or the Face ID status row), no line above. */
  actions: ReactNode
}

/** Centered brand screen: hero 72, gap 20, Title 1 + Body (gap 8), 64 of bottom padding lifts the block above the middle (Figma 515:45580). Start, Lock, Update and Device warning share it, so the mark and title sit at the same y. */
export function BrandScreen({ hero, title, body, actions }: Props) {
  const t = useTheme()
  return (
    <Screen footer={actions} footerLine={false}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: t.primitive.space[5], paddingBottom: t.primitive.space[16] }}>
        {hero ?? <BrandMark />}
        <View style={{ alignSelf: 'stretch', alignItems: 'center', gap: t.primitive.space[2] }}>
          <Text variant="title1" accessibilityRole="header" style={{ textAlign: 'center' }}>{title}</Text>
          {body ? <Text variant="body" color={t.semantic.text.secondary} style={{ textAlign: 'center' }}>{body}</Text> : null}
        </View>
      </View>
    </Screen>
  )
}
