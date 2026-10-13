// Figma: product screen frame (S10R 309:666 / S22 309:1047): canvas, body px screen.padding, content pt space-2, section gap 24
import type { ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../theme'

type Props = {
  children: ReactNode
  footer?: ReactNode
  edges?: ('top' | 'bottom')[]
  /** `section` = layout.sectionGap.product (24, default). `group` = layout.groupGap (16), used by frame S10N. `row` = layout.rowGap (12), used by S40. */
  gap?: 'section' | 'group' | 'row'
}

/** Safe-area screen with canvas background, scroll body and optional pinned footer. */
export function Screen({ children, footer, edges = ['top', 'bottom'], gap = 'section' }: Props) {
  const t = useTheme()
  const l = t.semantic.layout
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: t.semantic.surface.canvas }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: l.screen.padding,
          paddingTop: t.primitive.space[2],
          paddingBottom: t.primitive.space[2],
          gap: gap === 'group' ? l.groupGap : gap === 'row' ? l.rowGap : l.sectionGap.product,
          flexGrow: 1,
        }}
      >
        {children}
      </ScrollView>
      {footer ? <View style={{ paddingHorizontal: l.screen.padding, paddingTop: l.groupGap, paddingBottom: t.primitive.space[2] }}>{footer}</View> : null}
    </SafeAreaView>
  )
}
