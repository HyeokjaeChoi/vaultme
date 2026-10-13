import { useEffect } from 'react'
import { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated'

// DESIGN motion (emil-design-eng): strong ease-out for UI. No tokens exist for these values yet.
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1)
const PRESS_SCALE = 0.97
const PRESS_MS = 160
const FOLD_MS = 200

/** Press feedback: scale 0.97 over 160 ms ease-out. Off under Reduce Motion (the pressed color still shows). Spread `handlers` on the Pressable, `style` on its Animated.View wrapper. */
export function usePressScale() {
  const reduce = useReducedMotion()
  const scale = useSharedValue(1)
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }))
  const to = (v: number) => {
    if (!reduce) scale.set(withTiming(v, { duration: PRESS_MS, easing: EASE_OUT }))
  }
  return { style, handlers: { onPressIn: () => to(PRESS_SCALE), onPressOut: () => to(1) } }
}

/** One-time entrance for an answered-question row: opacity 0 -> 1 and translateY `offset` -> 0 over 200 ms. Off under Reduce Motion. */
export function useFoldIn(offset: number) {
  const reduce = useReducedMotion()
  const p = useSharedValue(reduce ? 1 : 0)
  useEffect(() => {
    if (!reduce) p.set(withTiming(1, { duration: FOLD_MS, easing: EASE_OUT }))
  }, [])
  return useAnimatedStyle(() => ({ opacity: p.get(), transform: [{ translateY: (1 - p.get()) * offset }] }))
}
