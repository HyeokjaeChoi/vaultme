// Figma: Bottom sheet 301:606 (Grabber 301:607), Redesign B: top radius sheetB.radius 32, Title 3, Secondary action above Primary; B/Bottom sheet 399:157 Show notice slot (Notice 664:109194)
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Modal, PanResponder, Pressable, ScrollView, useWindowDimensions, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { ko } from '@vaultme/i18n'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme'
import { OnRaisedContext } from '../theme/sheet'
import { Button } from './Button'
import { Text } from './Text'

// DESIGN motion: sheet open 250 ms (0.32,0.72,0,1), close 200 ms. Open has no token; close = motion.duration.baseMs.
const OPEN_MS = 250
const OPEN_EASING = Easing.bezier(0.32, 0.72, 0, 1)
// Grabber drag (staff-PD P1-3): close when dragged past 30% of the sheet height or released faster than 500 pt/s; else spring back.
const DISMISS_FRACTION = 0.3
const DISMISS_VELOCITY = 500
const RUBBER = 0.15
const SPRING = { duration: 300, dampingRatio: 0.8 }

type SheetAction = { label: string; onPress: () => void; /** Secondary only: the action cannot be undone, so it gets a danger-colored label. */ danger?: boolean }
type Props = {
  visible: boolean
  onClose: () => void
  title: string
  children?: ReactNode
  /** The `Show notice` slot: a Status notice (inline, e.g. danger) between the body and the actions. Off when omitted. */
  notice?: ReactNode
  /** Primary (below). For a question about something irreversible this is the SAFE action ("취소"), never the one that executes (owner rule 2026-10-17, all sheets). */
  primary?: SheetAction
  /** Secondary (above Primary). The executing action of a risky question sits here with `danger`. */
  secondary?: SheetAction
  /** Free-form buttons (Secondary first, Primary last). Prefer `primary` / `secondary`. */
  actions?: ReactNode
}

/** C32 Bottom sheet, attached to the bottom edge (home-indicator padding inside). Max height 90%, only the content scrolls, actions stay pinned: Secondary above, Primary below. Buttons inside use the on-raised Secondary fill. */
export function BottomSheet({ visible, onClose, title, children, notice, primary, secondary, actions }: Props) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const reduce = useReducedMotion()
  const [mounted, setMounted] = useState(visible)
  const y = useSharedValue(height)
  const closeMs = t.primitive.motion.duration.baseMs
  const sheetH = useRef(0)
  const live = useRef({ onClose, reduce })
  useEffect(() => {
    live.current = { onClose, reduce }
  }, [onClose, reduce])
  // Plain PanResponder on the grabber: it needs no native gesture module, and a sheet drag is one touch on the JS thread.
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_, g) => y.set(g.dy > 0 ? g.dy : g.dy * RUBBER),
        onPanResponderRelease: (_, g) => {
          if (g.dy > sheetH.current * DISMISS_FRACTION || g.vy * 1000 > DISMISS_VELOCITY) live.current.onClose()
          else y.set(live.current.reduce ? 0 : withSpring(0, { ...SPRING, velocity: g.vy * 1000 }))
        },
        onPanResponderTerminate: () => y.set(live.current.reduce ? 0 : withSpring(0, SPRING)),
      }),
    [y],
  )

  useEffect(() => {
    if (visible) {
      setMounted(true)
      y.set(reduce ? 0 : withTiming(0, { duration: OPEN_MS, easing: OPEN_EASING }))
    } else if (mounted) {
      y.set(withTiming(height, { duration: reduce ? 0 : closeMs, easing: OPEN_EASING }, (done) => {
        if (done) scheduleOnRN(setMounted, false)
      }))
    }
  }, [visible])

  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }))
  const scrim = useAnimatedStyle(() => ({ opacity: 1 - Math.min(Math.max(y.get(), 0) / height, 1) }))
  const pad = t.semantic.layout.screen.padding

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, scrim]}>
          <Pressable accessibilityRole="button" accessibilityLabel={ko.common.close} onPress={onClose} style={{ flex: 1, backgroundColor: t.component.overlay.scrimBg, opacity: t.component.overlay.scrimOpacity }} />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          onLayout={(e) => void (sheetH.current = e.nativeEvent.layout.height)}
          style={[
            {
              maxHeight: '90%',
              backgroundColor: t.component.overlay.bg,
              borderTopLeftRadius: t.component.sheetB.radius,
              borderTopRightRadius: t.component.sheetB.radius,
              alignItems: 'center',
              paddingTop: t.primitive.space[2],
              paddingHorizontal: pad,
              paddingBottom: insets.bottom + t.primitive.space[4],
              gap: t.semantic.layout.groupGap,
              ...t.component.overlay.shadow,
            },
            sheet,
          ]}
        >
          {/* ponytail: grabber height 5 has no token; space-1 (4) is the nearest. */}
          <View {...pan.panHandlers} hitSlop={{ top: t.primitive.space[4], bottom: t.primitive.space[4], left: t.primitive.space[8], right: t.primitive.space[8] }} style={{ width: t.primitive.size.control_sm, height: t.primitive.space[1], borderRadius: t.component.buttonB.radius, backgroundColor: t.component.bottomSheet.grabber }} />
          <ScrollView style={{ flexShrink: 1, alignSelf: 'stretch' }} contentContainerStyle={{ gap: t.semantic.layout.groupGap }}>
            <Text variant="title3" accessibilityRole="header" color={t.component.overlay.fg}>{title}</Text>
            {children}
          </ScrollView>
          {notice ? <View style={{ alignSelf: 'stretch' }}>{notice}</View> : null}
          <OnRaisedContext value>
            <View style={{ gap: t.semantic.layout.fieldGap, alignSelf: 'stretch' }}>
              {secondary ? <Button variant="secondary" label={secondary.label} onPress={secondary.onPress} {...(secondary.danger ? { danger: true } : {})} /> : null}
              {primary ? <Button label={primary.label} onPress={primary.onPress} /> : null}
              {actions}
            </View>
          </OnRaisedContext>
        </Animated.View>
      </View>
    </Modal>
  )
}
