// Figma: product screen frame (R-S10R 333:113 / R-S22 336:390): canvas, optional Nav row, body px screen.padding, content pt space-2, section gap 24, Actions pinned below
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../theme'

type Props = {
  children: ReactNode
  /** Navigation row above the scroll body (bare back button). */
  header?: ReactNode
  footer?: ReactNode
  edges?: ('top' | 'bottom')[]
  /** `section` = layout.sectionGap.product (24, default). `group` = layout.groupGap (16), used by frame S10N. `row` = layout.rowGap (12), used by S40. */
  gap?: 'section' | 'group' | 'row'
  /** Space between the header and the first block. `field` = 8 (default), `group` = 16 (frame S20B). */
  topGap?: 'field' | 'group'
}

/** Safe-area screen with canvas background, scroll body and optional pinned footer. */
export function Screen({ children, header, footer, edges = ['top', 'bottom'], gap = 'section', topGap = 'field' }: Props) {
  const t = useTheme()
  const l = t.semantic.layout
  const scrollRef = useRef<ScrollView>(null)
  const [layoutHeight, setLayoutHeight] = useState(0)
  const [contentHeight, setContentHeight] = useState(0)
  const overflows = contentHeight > layoutHeight + 1

  useEffect(() => {
    if (overflows) scrollRef.current?.flashScrollIndicators()
  }, [overflows])

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: t.semantic.surface.canvas }}>
      {header}
      <ScrollView
        ref={scrollRef}
        onLayout={(e) => setLayoutHeight(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => setContentHeight(h)}
        contentContainerStyle={{
          paddingHorizontal: l.screen.padding,
          paddingTop: topGap === 'group' ? l.groupGap : t.primitive.space[2],
          paddingBottom: t.primitive.space[2],
          gap: gap === 'group' ? l.groupGap : gap === 'row' ? l.rowGap : l.sectionGap.product,
          flexGrow: 1,
        }}
      >
        {children}
      </ScrollView>
      {footer ? (
        // Fixed-footer boundary only when content scrolls under it (AGENTS rule 10 functional exception).
        <View
          style={{
            paddingHorizontal: l.screen.padding,
            paddingTop: l.groupGap,
            paddingBottom: t.primitive.space[2],
            borderTopWidth: overflows ? t.component.reviewFooter.borderWidth : t.primitive.borderWidth.none,
            borderTopColor: t.semantic.border.subtle,
          }}
        >
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  )
}
