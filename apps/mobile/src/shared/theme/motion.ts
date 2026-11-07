import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  cancelAnimation,
  cubicBezier,
  Easing,
  FadeIn,
  FadeOut,
  Keyframe,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { light } from '@vaultme/tokens'
import { revealWindow, SETTLE_MS, staggerDelay, staggers } from '../lib/stagger'
import { planTravel, scaleAt } from './selection-travel'

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

const ROW_MS = light.primitive.motion.duration.baseMs // same in dark
const RISE = light.primitive.space[2] // 8, same in dark

/** Opacity 0 -> 1 and a rise of 8 px (nothing else: no scale, no blur) after `delay` ms, over `ms`. Reduce Motion callers do not use it. */
const build = (delay: number, ms: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateY: RISE }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: EASE_OUT },
  })
    .delay(delay)
    .duration(ms)
const rises = new Map<number, ReturnType<typeof build>>() // one per delay (at most 5 + the detail lines): `entering` is read at mount only, so rows can share it
const riseIn = (delay: number, ms: number) => {
  const key = delay * 1000 + ms
  const made = rises.get(key) ?? build(delay, ms)
  rises.set(key, made)
  return made
}

/**
 * First-reveal list stagger (DESIGN.md Motion): returns `enter(index)`, the props to spread on the Animated.View around row `index` (`{ entering }` or `{}`).
 * Only when this screen showed `loading` first and the rows mount inside the reveal window (until the last delay plus the row time after loading ends). Refresh, rows loaded by scrolling and value updates mount later, so they show at once.
 * Reduce Motion: `{}`. Delay 30 ms per row, the first 5 only (`staggerDelay`).
 */
export function useStaggerReveal(loading: boolean) {
  const reduce = useReducedMotion()
  const [sawLoading] = useState(loading) // read at mount only: a later reload (retry, refetch) is not a first reveal
  const [closed, setClosed] = useState(false) // the reveal window has passed; it never opens again
  useEffect(() => {
    if (loading) return
    const id = setTimeout(() => setClosed(true), revealWindow(ROW_MS))
    return () => clearTimeout(id)
  }, [loading])
  const on = staggers({ sawLoading, open: !closed, reduce })
  return useCallback((index: number) => (on ? { entering: riseIn(staggerDelay(index), ROW_MS) } : {}), [on])
}

/** Detail-line stagger (DESIGN.md Motion): `entering` for line `index` (0-based) of a read-only detail screen, only while the screen opens; lines after the fifth share its delay. Reduce Motion: none. Read at mount only. */
export function useLineEntering(index: number) {
  const reduce = useReducedMotion()
  return useMemo(() => (reduce ? undefined : riseIn(staggerDelay(index, SETTLE_MS), ROW_MS)), [reduce, index])
}

/**
 * Selection travel (Figma Switch 300:611, Segmented 300:622 motion notes): the knob or pill moves to slot `index` over motion.duration.fastMs ease-out
 * and stretches to STRETCH_MAX at mid-travel. Transform only, on the UI thread. Slot 0 is the rest position; one slot is `step` px.
 * Reduce Motion: it jumps, no stretch. A new `index` mid-travel starts from where the element is, at its current width (no pop). Spread `style` on an Animated.View.
 */
export function useSelectionTravel(index: number, step: number) {
  const reduce = useReducedMotion()
  const from = useSharedValue(index)
  const to = useSharedValue(index)
  const t = useSharedValue(1)
  const s0 = useSharedValue(1) // scale at the start of the current travel
  useEffect(() => {
    const plan = planTravel(reduce, from.get() + (to.get() - from.get()) * t.get(), to.get(), index)
    from.set(plan.from)
    to.set(index)
    if (plan.animate) {
      s0.set(scaleAt(t.get(), s0.get()))
      t.set(0)
      t.set(withTiming(1, { duration: PRESS_MS, easing: EASE_OUT }))
    } else {
      s0.set(1)
      t.set(1)
    }
  }, [from, to, t, s0, index, reduce])
  return useAnimatedStyle(() => {
    const x = from.get() + (to.get() - from.get()) * t.get()
    return {
      transform: [{ translateX: x * step }, { scaleX: scaleAt(t.get(), s0.get()) }],
    }
  })
}
