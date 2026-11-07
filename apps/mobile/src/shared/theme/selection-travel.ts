// Pure math of the selection travel (useSelectionTravel in motion.ts), kept apart so unit tests can import it without the Reanimated hooks.
import { interpolate } from 'react-native-reanimated'

/** DESIGN.md Motion (owner 2026-11-07): a knob or pill may stretch up to 12% while it travels. */
const STRETCH_MAX = 1.12

/** scaleX at travel progress `p` (0..1): 1 at both ends, STRETCH_MAX at the middle. Used inside worklets, so it needs the directive. */
function stretchAt(p: number): number {
  'worklet'
  return interpolate(p, [0, 0.5, 1], [1, STRETCH_MAX, 1])
}

/** scaleX at progress `t` when the travel started with scale `s0` (an interrupted travel): `s0` eases back to the normal curve, never above STRETCH_MAX. Worklet. */
export function scaleAt(t: number, s0: number): number {
  'worklet'
  return Math.min(STRETCH_MAX, stretchAt(t) + (s0 - 1) * (1 - t))
}

/** Where a travel starts and whether it animates when the target slot is `index`. `at` is the current position (from + (to - from) * t). Pure, so it is unit tested. */
export function planTravel(reduce: boolean, at: number, target: number, index: number) {
  if (reduce) return { from: index, animate: false }
  if (target === index) return { from: index, animate: false } // mount or a re-render with the same slot: no travel, no stretch
  return { from: at, animate: true }
}
