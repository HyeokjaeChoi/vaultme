import { useEffect, useMemo, useState } from 'react'
import {
  cancelAnimation,
  cubicBezier,
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  Keyframe,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { light } from '@vaultme/tokens'

// DESIGN motion (emil-design-eng): strong ease-out for UI. Press = motion.duration.fastMs, fades = baseMs. Bloom, pop, spin, shake and the sheet open (250) have no token, so they keep their own ms.
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1)
export const EASE_OUT_CSS = cubicBezier(0.23, 1, 0.32, 1) // same curve as EASE_OUT, for Reanimated CSS transitions
const PRESS_SCALE = 0.97
const PRESS_MS = light.primitive.motion.duration.fastMs // same in dark

/** Press feedback: scale 0.97 over motion.duration.fastMs ease-out. Off under Reduce Motion (the pressed color still shows). Spread `handlers` on the Pressable, `style` on its Animated.View wrapper. */
export function usePressScale() {
  const reduce = useReducedMotion()
  const scale = useSharedValue(1)
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }))
  const to = (v: number) => {
    if (!reduce) scale.set(withTiming(v, { duration: PRESS_MS, easing: EASE_OUT }))
  }
  return { style, handlers: { onPressIn: () => to(PRESS_SCALE), onPressOut: () => to(1) } }
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
  }, [r, on, reduce])
  return useAnimatedStyle(() => ({ transform: [{ rotate: `${String(r.get())}deg` }] }))
}

/** Unlock bloom (Figma B-S90 note, owner 2026-10-17): the keyhole spreads the brand color, 400 ms ease-out. Reduce Motion: the screen cross-fades over the same time. */
export const BLOOM_MS = 400

const POP_MS = 400
const POP_FROM = 0.6

/**
 * Confirmed hero (Figma B-S23 Confirmed note, owner 2026-10-17): the check badge scales 0.6 -> 1.0 over 400 ms ease-out when `on` turns true (or the screen opens already Confirmed).
 * Reduce Motion: no scale, the final state shows at once (the haptic still fires elsewhere). Put the returned style on an Animated.View around the badge.
 */
export function useCheckPop(on: boolean) {
  const reduce = useReducedMotion()
  const s = useSharedValue(1)
  useEffect(() => {
    // eslint-disable-next-line react-you-might-not-need-an-effect/no-event-handler -- drives a Reanimated value (an external system) when `on` changes
    if (!on || reduce) {
      s.set(1)
      return
    }
    s.set(POP_FROM)
    s.set(withTiming(1, { duration: POP_MS, easing: EASE_OUT }))
  }, [s, on, reduce])
  return useAnimatedStyle(() => ({ transform: [{ scale: s.get() }] }))
}

const SHAKE_STEP_MS = 40
const SHAKE_HALF_STEPS = 6 // 3 cycles (left, right) + the return to 0 = 7 steps x 40 ms = 280 ms

/**
 * Rejected-input shake: translateX +-`amplitude` for 3 cycles in 280 ms, on the UI thread. Under Reduce Motion `shake` does nothing (the caller still gives the haptic).
 * Put `style` on an Animated.View around the shaking content.
 */
export function useShake(amplitude: number) {
  const reduce = useReducedMotion()
  const x = useSharedValue(0)
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }))
  const step = (to: number) => withTiming(to, { duration: SHAKE_STEP_MS, easing: Easing.linear })
  const shake = () => {
    if (reduce) return
    x.set(
      withSequence(
        ...Array.from({ length: SHAKE_HALF_STEPS }, (_, i) => step(i % 2 === 0 ? -amplitude : amplitude)),
        step(0),
      ),
    )
  }
  return { style, shake }
}

/**
 * Toast enter/exit (motion audit M1): rises `rise` px while it fades in over `enterMs`, fades out over `exitMs`. Spread both on the toast's Animated.View.
 * Reduce Motion: opacity only, no travel.
 */
export function useToastMotion(rise: number, enterMs: number, exitMs: number) {
  const reduce = useReducedMotion()
  return useMemo(
    () => ({
      entering: reduce
        ? FadeIn.duration(enterMs)
        : new Keyframe({
            0: { opacity: 0, transform: [{ translateY: rise }] },
            100: { opacity: 1, transform: [{ translateY: 0 }], easing: EASE_OUT },
          }).duration(enterMs),
      exiting: FadeOut.duration(exitMs),
    }),
    [reduce, rise, enterMs, exitMs],
  )
}

/**
 * Skeleton -> content fade (motion audit M2): the props (`{ entering }`, or `{}`) to spread on the Animated.View that wraps the loaded content (a container, never a virtualized row).
 * Set only when this screen showed `loading` first, so content that was already there does not fade in. Reduce Motion: `{}`, the swap is instant.
 * The skeleton leaves at once. Read at mount only, so call it where the wrapper mounts when `loading` turns false.
 */
export function useRevealEntering(loading: boolean, ms: number) {
  const reduce = useReducedMotion()
  const [sawLoading, setSawLoading] = useState(loading)
  if (loading && !sawLoading) setSawLoading(true)
  return reduce || !sawLoading ? {} : { entering: FadeIn.duration(ms).easing(EASE_OUT) }
}

/** DESIGN.md Motion (owner 2026-11-07): a knob or pill may stretch up to 12% while it travels. */
export const STRETCH_MAX = 1.12

/** scaleX at travel progress `p` (0..1): 1 at both ends, STRETCH_MAX at the middle. Used inside worklets, so it needs the directive. */
export function stretchAt(p: number): number {
  'worklet'
  return interpolate(p, [0, 0.5, 1], [1, STRETCH_MAX, 1])
}

/** Where a travel starts and whether it animates when the target slot is `index`. `at` is the current position (from + (to - from) * t). Pure, so it is unit tested. */
export function planTravel(reduce: boolean, at: number, target: number, index: number) {
  if (reduce) return { from: index, animate: false }
  if (target === index) return { from: index, animate: false } // mount or a re-render with the same slot: no travel, no stretch
  return { from: at, animate: true }
}

/**
 * Selection travel (Figma Switch 300:611, Segmented 300:622 motion notes): the knob or pill moves to slot `index` over motion.duration.fastMs ease-out
 * and stretches to STRETCH_MAX at mid-travel. Transform only, on the UI thread. Slot 0 is the rest position; one slot is `step` px, or `'self'` = the element's own width.
 * Reduce Motion: it jumps, no stretch. A new `index` mid-travel starts from where the element is. Spread `style` on an Animated.View.
 */
export function useSelectionTravel(index: number, step: number | 'self') {
  const reduce = useReducedMotion()
  const from = useSharedValue(index)
  const to = useSharedValue(index)
  const t = useSharedValue(1)
  useEffect(() => {
    const plan = planTravel(reduce, from.get() + (to.get() - from.get()) * t.get(), to.get(), index)
    from.set(plan.from)
    to.set(index)
    if (plan.animate) {
      t.set(0)
      t.set(withTiming(1, { duration: PRESS_MS, easing: EASE_OUT }))
    } else t.set(1)
  }, [from, to, t, index, reduce])
  return useAnimatedStyle(() => {
    const x = from.get() + (to.get() - from.get()) * t.get()
    return {
      transform: [
        { translateX: step === 'self' ? (`${String(x * 100)}%` as const) : x * step },
        { scaleX: stretchAt(t.get()) },
      ],
    }
  })
}
