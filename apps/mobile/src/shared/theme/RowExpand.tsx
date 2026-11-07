import { useRef, useState, type ReactNode } from 'react'
import type { HostInstance, LayoutChangeEvent } from 'react-native'
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { light } from '@vaultme/tokens'
import { EASE_OUT, useLineEntering } from './motion'

const EXPAND_MS = light.primitive.motion.duration.enterMs // same in dark
const FALLBACK_MS = 400

/** Where the pressed row was on screen (window points), kept for the detail screen that opens next. */
type RowFrame = { y: number; height: number }
const FRAME_TTL_MS = 1500 // a frame older than this belongs to an open that never came (or a lookup that took long): show the card as it is
const MEASURE_WAIT_MS = 120 // open the detail even when the measure callback never runs
let pressed: { frame: RowFrame; at: number } | null = null
const takeRowFrame = () => {
  const p = pressed
  pressed = null // used once: a deep link or a later open does not expand from an old row
  return p && Date.now() - p.at < FRAME_TTL_MS ? p.frame : null
}

/** Measures `row` (window points), remembers its frame and calls `then` (the router push) once; `then` runs after MEASURE_WAIT_MS at the latest. */
export function measureRow(row: HostInstance | null, then: () => void) {
  let done = false
  const go = () => {
    if (done) return
    done = true
    then()
  }
  if (!row) {
    go()
    return
  }
  row.measureInWindow((_x, y, _w, height) => {
    if (done) return // the push already went without a frame: a late result must not leak to the next detail
    pressed = { frame: { y, height }, at: Date.now() }
    go()
  })
  setTimeout(() => {
    if (!done) pressed = null
    go()
  }, MEASURE_WAIT_MS)
}

/**
 * "Same object expands" (owner 2026-11-07; Figma Motion · 행→상세 전환 988:20987): the detail screen's top card opens from the pressed row's frame to its own size over motion.duration.enterMs, ease-out. The card is clipped (its content is never scaled) and fades in with it.
 * WORKAROUND, not Reanimated shared element transitions: in 4.7.1 they are experimental, need the static flag ENABLE_SHARED_ELEMENT_TRANSITIONS (native rebuild), support only the native stack (the Tab navigator is not supported, and the activity rows live in `(tabs)`) and move the zIndex of exiting views.
 * Removal condition: delete this and use `sharedTransitionTag` on the row and the card once Reanimated ships shared element transitions as stable with Tab navigator support.
 * No remembered row (deep link, push notification) or Reduce Motion: the card shows as it is.
 */
export function ExpandFromRow({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion()
  const [from] = useState<RowFrame | null>(takeRowFrame) // taken even under Reduce Motion, so a stale frame never lingers
  const outer = useRef<HostInstance>(null)
  const started = useRef(false)
  const p = useSharedValue(from && !reduce ? 0 : 1)
  const full = useSharedValue(-1) // the card's own height, known after layout
  const dy = useSharedValue(0)
  const active = from !== null && !reduce
  const box = useAnimatedStyle(() => {
    if (!from || !active) return {}
    // Explicit end values: a removed style prop is not reset on the native side, and the card's height changes with its text (Pending to Confirmed).
    if (p.get() === 1)
      return { height: 'auto' as const, overflow: 'visible' as const, opacity: 1, transform: [{ translateY: 0 }] }
    return {
      height: full.get() < 0 ? from.height : interpolate(p.get(), [0, 1], [from.height, full.get()]),
      overflow: 'hidden' as const,
      transform: [{ translateY: dy.get() * (1 - p.get()) }],
      opacity: full.get() < 0 ? 0 : p.get(),
    }
  })
  const onLayout = (e: LayoutChangeEvent) => {
    if (!from || !active || started.current) return
    started.current = true
    const h = e.nativeEvent.layout.height
    const open = () => {
      if (!p.get()) p.set(1) // the card is never left hidden if the measure callback does not run
    }
    setTimeout(open, FALLBACK_MS)
    outer.current?.measureInWindow((_x, y) => {
      full.set(h)
      dy.set(from.y - y)
      p.set(withTiming(1, { duration: EXPAND_MS, easing: EASE_OUT }))
    })
  }
  return (
    <Animated.View ref={outer} style={box}>
      <Animated.View onLayout={onLayout}>{children}</Animated.View>
    </Animated.View>
  )
}

/** One detail line (index 0-based): rises in 120 ms after the screen opens, 30 ms apart, the first 5 (later ones share the fifth's delay). Wrap each line of a read-only detail screen; not warnings, review or result screens. */
export function StaggerLine({ index, children }: { index: number; children: ReactNode }) {
  const entering = useLineEntering(index)
  return <Animated.View {...(entering ? { entering } : {})}>{children}</Animated.View>
}
