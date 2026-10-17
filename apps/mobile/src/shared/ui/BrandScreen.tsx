// Figma: Brand layout of B-S01 423:13440, B-S90 423:15412, B-S91 423:15443, B-S92 423:15474 (centered Brand block above the actions; Brand/Mark 495:17569)
import type { ReactNode } from 'react'
import type { SharedValue } from 'react-native-reanimated'
import { View } from 'react-native'
import { useTheme } from '../theme'
import { BrandMark } from './BrandMark'
import { Screen } from './Screen'
import { Text } from './Text'

type Props = {
  /** Replaces the mark (S92 draws a warning hero). */
  hero?: ReactNode
  title: string
  /** Start and Lock show the wordmark (Display M); Update and Device warning show a Title 1 headline. */
  wordmark?: boolean
  /** Body variant: Start uses Title 2 (value prop), the others Body. */
  bodyVariant?: 'title2' | 'body'
  /** Unlock bloom progress (0..1) drawn inside the mark. */
  bloom?: SharedValue<number>
  /** Body under the title, centered. Lines break with \n. */
  body?: string
  /** Mono Fact line under the brand block, centered (Product B/Fact upper): version, network, chain id (Start). */
  fact?: string
  /** Pinned actions (buttons, or the Face ID status row), no line above. */
  actions: ReactNode
}

/** Centered brand screen: mark 96, gap space/8, wordmark Display M or Title 1 + body (gap 8), 64 of bottom padding lifts the block above the middle (Figma 515:45580). Start, Lock, Update and Device warning share it, so the mark and title sit at the same y. */
export function BrandScreen({ hero, title, wordmark, bodyVariant = 'body', bloom, body, fact, actions }: Props) {
  const t = useTheme()
  return (
    <Screen
      footer={actions}
      footerLine={false}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: t.primitive.space[8], paddingBottom: t.primitive.space[16] }}>
        {hero ?? <BrandMark {...(bloom ? { bloom } : {})} />}
        <View style={{ alignSelf: 'stretch', alignItems: 'center', gap: t.primitive.space[2] }}>
          <Text variant={wordmark ? 'displayM' : 'title1'} accessibilityRole="header" style={{ textAlign: 'center' }}>{title}</Text>
          {body ? <Text variant={bodyVariant} color={t.semantic.text.secondary} style={{ textAlign: 'center' }}>{body}</Text> : null}
          {fact ? <Text variant="factUpper" color={t.semantic.text.tertiary} style={{ textAlign: 'center', paddingTop: t.semantic.layout.groupGap }}>{fact.toUpperCase()}</Text> : null}
        </View>
      </View>
    </Screen>
  )
}
