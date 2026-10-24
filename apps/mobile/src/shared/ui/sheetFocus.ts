/**
 * A BottomSheet is an RN Modal: a native window above every route, outside the navigator. Its screen stays mounted when a
 * route is pushed over it or another tab is chosen, so the sheet follows the screen's focus, not only `visible`.
 */
export const sheetOnScreen = (s: { mounted: boolean; focused: boolean }): boolean => s.mounted && s.focused

/** Blur closes an open sheet (its owner resets the state), so the sheet does not come back when the screen is focused again. */
export const closeOnBlur = (s: { visible: boolean; focused: boolean }): boolean => s.visible && !s.focused

// Grabber drag (staff-PD P1-3): close when dragged past 30% of the sheet height or released faster than 500 pt/s; else spring back.
const DISMISS_FRACTION = 0.3
const DISMISS_VELOCITY = 500

/** A grabber release closes the sheet only when it may be dismissed; otherwise (or below the thresholds) it springs back. `vy` in pt/ms. */
export const releaseCloses = (s: { dy: number; vy: number; height: number; dismissible: boolean }): boolean =>
  s.dismissible && (s.dy > s.height * DISMISS_FRACTION || s.vy * 1000 > DISMISS_VELOCITY)
