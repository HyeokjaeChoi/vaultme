import { light } from '@vaultme/tokens'

// DESIGN.md Motion (owner 2026-11-07, PR #463): rows and detail lines may stagger by 30 ms, the first 5 only; later ones show with the fifth. There is no token for 30 ms, so it lives here.
const STAGGER_MS = 30
const STAGGER_MAX = 5
/** A detail screen starts its lines this long after it opens, as the container settles (motion.duration.fastMs, 120). */
export const SETTLE_MS = light.primitive.motion.duration.fastMs // 120, same in dark

/** Delay of item `index` (0-based): 30 ms apart; item 5 and later share the fifth's delay. */
export const staggerDelay = (index: number, base = 0) => base + Math.min(index, STAGGER_MAX - 1) * STAGGER_MS

/** How long after the loading ends a list still counts as "first reveal": the last delay plus the row's own duration. Rows that mount later (refresh, scroll) show at once. */
export const revealWindow = (rowMs: number) => staggerDelay(STAGGER_MAX) + rowMs

/**
 * Whether item `index` enters animated. `sawLoading`: this screen showed its loading state first (content that was already there does not animate).
 * `open`: still inside the reveal window. `reduce`: Reduce Motion shows the final state.
 */
export const staggers = (p: { sawLoading: boolean; open: boolean; reduce: boolean }) =>
  p.sawLoading && p.open && !p.reduce
