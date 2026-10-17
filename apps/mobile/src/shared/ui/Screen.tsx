// Figma: product screen frame (R-S10R 333:113 / R-S22 336:390): screenB.bg (flat white), optional Nav row, body px screen.padding, content pt space-2, section gap 24, Actions pinned below
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
  /** `section` = layout.sectionGap.product (24, default). `group` = layout.groupGap (16), used by frame S10N. `row` = layout.rowGap (12), used by S40. `none` = 0: Redesign B blocks carry their own padding (Section header, Action row, Detail row), so the screen adds no gap. */
  gap?: 'section' | 'group' | 'row' | 'none'
  /** Space between the header and the first block. `field` = 8 (default), `group` = 16 (frame S20B). */
  topGap?: 'field' | 'group'
  /** Full-bleed body: no side padding. Band screens (review, result, detail) place Section bands edge to edge; their blocks pad themselves. */
  bleed?: boolean
}

/** Safe-area screen with screenB.bg background, scroll body and optional pinned footer. */
export function Screen({ children, header, footer, edges = ['top', 'bottom'], gap = 'section', topGap = 'field', bleed }: Props) {
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
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: t.component.screenB.bg }}>
      {header}
      <ScrollView
        ref={scrollRef}
        onLayout={(e) => setLayoutHeight(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => setContentHeight(h)}
        contentContainerStyle={{
          paddingHorizontal: bleed ? 0 : l.screen.padding,
          paddingTop: bleed ? 0 : topGap === 'group' ? l.groupGap : t.primitive.space[2],
          paddingBottom: bleed ? 0 : t.primitive.space[2],
          gap: gap === 'none' ? 0 : gap === 'group' ? l.groupGap : gap === 'row' ? l.rowGap : l.sectionGap.product,
          flexGrow: 1,
        }}
      >
        {children}
      </ScrollView>
      {footer ? (
        // Fixed-footer boundary (AGENTS rule 10 functional exception): Figma draws the 1 px line above the actions on every screen with a footer.
        <View
          style={{
            paddingHorizontal: l.screen.padding,
            paddingTop: t.primitive.space[3],
            paddingBottom: t.primitive.space[1],
            gap: l.fieldGap,
            borderTopWidth: t.component.reviewFooter.borderWidth,
            borderTopColor: t.semantic.border.subtle,
          }}
        >
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  )
}
