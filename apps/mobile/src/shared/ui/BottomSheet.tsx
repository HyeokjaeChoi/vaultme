// Figma: Bottom sheet 301:606 (Grabber 301:607), Redesign B: top radius sheetB.radius 32, Title 3, Secondary action above Primary
import { useEffect, useState, type ReactNode } from 'react'
import { Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native'
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated'
import { ko } from '@vaultme/i18n'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme'
import { OnRaisedContext } from '../theme/sheet'
import { Button } from './Button'
import { Text } from './Text'

// DESIGN motion: sheet open 250 ms (0.32,0.72,0,1), close 200 ms. Open has no token; close = motion.duration.baseMs.
const OPEN_MS = 250
const OPEN_EASING = Easing.bezier(0.32, 0.72, 0, 1)

type SheetAction = { label: string; onPress: () => void; /** Secondary only: the action cannot be undone, so it gets a danger-colored label. */ danger?: boolean }
type Props = {
  visible: boolean
  onClose: () => void
  title: string
  children?: ReactNode
  /** Primary (below). For a question about something irreversible this is the SAFE action ("취소"), never the one that executes (owner rule 2026-10-17, all sheets). */
  primary?: SheetAction
  /** Secondary (above Primary). The executing action of a risky question sits here with `danger`. */
  secondary?: SheetAction
  /** Free-form buttons (Secondary first, Primary last). Prefer `primary` / `secondary`. */
  actions?: ReactNode
}

/** C32 Bottom sheet, attached to the bottom edge (home-indicator padding inside). Max height 90%, only the content scrolls, actions stay pinned: Secondary above, Primary below. Buttons inside use the on-raised Secondary fill. */
export function BottomSheet({ visible, onClose, title, children, primary, secondary, actions }: Props) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const reduce = useReducedMotion()
  const [mounted, setMounted] = useState(visible)
  const y = useSharedValue(height)
  const closeMs = t.primitive.motion.duration.baseMs

  useEffect(() => {
    if (visible) {
      setMounted(true)
      y.value = reduce ? 0 : withTiming(0, { duration: OPEN_MS, easing: OPEN_EASING })
    } else if (mounted) {
      y.value = withTiming(height, { duration: reduce ? 0 : closeMs, easing: OPEN_EASING }, (done) => {
        if (done) runOnJS(setMounted)(false)
      })
    }
  }, [visible])

  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }))
  const scrim = useAnimatedStyle(() => ({ opacity: 1 - Math.min(y.value / height, 1) }))
  const pad = t.semantic.layout.screen.padding

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, scrim]}>
          <Pressable accessibilityRole="button" accessibilityLabel={ko.common.close} onPress={onClose} style={{ flex: 1, backgroundColor: t.semantic.surface.inverse, opacity: t.semantic.effect.modalScrimOpacity }} />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
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
          <View style={{ width: t.primitive.size.control_sm, height: t.primitive.space[1], borderRadius: t.component.buttonB.radius, backgroundColor: t.component.bottomSheet.grabber }} />
          <ScrollView style={{ flexShrink: 1, alignSelf: 'stretch' }} contentContainerStyle={{ gap: t.semantic.layout.groupGap }}>
            <Text variant="title3" accessibilityRole="header" color={t.component.overlay.fg}>{title}</Text>
            {children}
          </ScrollView>
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
