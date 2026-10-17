// Figma: product screen frame (R-S10R 333:113 / R-S22 336:390): screenB.bg (flat white), optional Nav row, body px screen.padding, content pt space-2, section gap 24, Actions pinned below
import { type MutableRefObject, type ReactNode, useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../theme'

type Props = {
  children: ReactNode
  /** Navigation row above the scroll body (bare back button). */
  header?: ReactNode
  footer?: ReactNode
  /** Full-width block at the top of the footer, above its padded Actions (S30: the faucet row, Figma Footer 565:88603). It brings its own side padding. */
  footerLead?: ReactNode
  edges?: ('top' | 'bottom')[]
  /** `section` = layout.sectionGap.product (24, default). `group` = layout.groupGap (16), used by frame S10N. `row` = layout.rowGap (12), used by S40. `none` = 0: Redesign B blocks carry their own padding (Section header, Action row, Detail row), so the screen adds no gap. */
  gap?: 'section' | 'group' | 'row' | 'none'
  /** Space between the header and the first block. `field` = 8 (default), `group` = 16 (frame S20B). */
  topGap?: 'none' | 'field' | 'group'
  /** Full-bleed body: no side padding. Band screens (review, result, detail) place Section bands edge to edge; their blocks pad themselves. */
  bleed?: boolean
  /** Brand screens (Figma 423:13440, 423:15412, 423:15443, 423:15474) draw no line above the actions. */
  footerLine?: boolean
  /** Form screens: the body shrinks above the keyboard, and `revealRef.current(y, height)` scrolls a body-content box into view with `l.screen.padding` (16) clearance. */
  revealRef?: MutableRefObject<((y: number | 'end', height?: number) => void) | null>
}

/** Safe-area screen with screenB.bg background, scroll body and optional pinned footer. */
export function Screen({ children, header, footer, footerLead, edges = ['top', 'bottom'], gap = 'section', topGap = 'field', bleed, footerLine = true, revealRef }: Props) {
  const t = useTheme()
  const l = t.semantic.layout
  const scrollRef = useRef<ScrollView>(null)
  const [layoutHeight, setLayoutHeight] = useState(0)
  const [contentHeight, setContentHeight] = useState(0)
  const scrollY = useRef(0)
  const overflows = contentHeight > layoutHeight + 1

  useEffect(() => {
    if (overflows) scrollRef.current?.flashScrollIndicators()
  }, [overflows])

  if (revealRef) {
    revealRef.current = (y, h = 0) => {
      if (y === 'end') return scrollRef.current?.scrollToEnd({ animated: true })
      const clear = l.screen.padding
      const top = scrollY.current
      if (y - clear < top) scrollRef.current?.scrollTo({ y: Math.max(0, y - clear), animated: true })
      else if (y + h + clear > top + layoutHeight) scrollRef.current?.scrollTo({ y: y + h + clear - layoutHeight, animated: true })
    }
  }

  const body = (
    <>
      {header}
      <ScrollView
        ref={scrollRef}
        onScroll={(e) => {
          scrollY.current = e.nativeEvent.contentOffset.y
        }}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        onLayout={(e) => setLayoutHeight(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => setContentHeight(h)}
        contentContainerStyle={{
          paddingHorizontal: bleed ? 0 : l.screen.padding,
          paddingTop: bleed || topGap === 'none' ? 0 : topGap === 'group' ? l.groupGap : t.primitive.space[2],
          paddingBottom: bleed ? l.groupGap : t.primitive.space[2], // bleed: last row keeps 16 clearance above the footer line / tab bar
          gap: gap === 'none' ? 0 : gap === 'group' ? l.groupGap : gap === 'row' ? l.rowGap : l.sectionGap.product,
          flexGrow: 1,
        }}
      >
        {children}
      </ScrollView>
      {footer ? (
        // Fixed-footer boundary (AGENTS rule 10 functional exception): Figma draws the 1 px line above the actions on every screen with a footer.
        <View style={{ borderTopWidth: footerLine ? t.component.reviewFooter.borderWidth : 0, borderTopColor: t.semantic.border.subtle }}>
          {footerLead}
          <View style={{ paddingHorizontal: l.screen.padding, paddingTop: t.primitive.space[3], paddingBottom: t.primitive.space[1], gap: l.fieldGap }}>
            {footer}
          </View>
        </View>
      ) : null}
    </>
  )
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: t.component.screenB.bg }}>
      {revealRef ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>{body}</KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  )
}
