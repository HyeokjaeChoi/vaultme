import { useEffect } from 'react'
import { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'

// DESIGN motion (emil-design-eng): strong ease-out for UI. No tokens exist for these values yet.
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1)
const PRESS_SCALE = 0.97
const PRESS_MS = 100
const FOLD_MS = 200

/** Press feedback: scale 0.97 over 100 ms ease-out. Off under Reduce Motion (the pressed color still shows). Spread `handlers` on the Pressable, `style` on its Animated.View wrapper. */
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

const SPIN_MS = 800

/** Busy spinner: rotate 0 -> 360 deg, 800 ms linear, looping, while `on`. Transform only. No rotation under Reduce Motion. Use on an Animated.View around the icon. */
export function useSpin(on: boolean) {
  const reduce = useReducedMotion()
  const r = useSharedValue(0)
  useEffect(() => {
    if (on && !reduce) r.set(withRepeat(withTiming(360, { duration: SPIN_MS, easing: Easing.linear }), -1))
    else {
      cancelAnimation(r)
      r.set(0)
    }
  }, [on, reduce])
  return useAnimatedStyle(() => ({ transform: [{ rotate: `${r.get()}deg` }] }))
}

/** Unlock bloom (Figma B-S90 note, owner 2026-10-17): the keyhole spreads the brand color, 400 ms ease-out. Reduce Motion: the screen cross-fades over the same time. */
export const BLOOM_MS = 400
