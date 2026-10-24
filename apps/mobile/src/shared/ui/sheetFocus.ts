/**
 * A BottomSheet is an RN Modal: a native window above every route, outside the navigator. Its screen stays mounted when a
 * route is pushed over it or another tab is chosen, so the sheet follows the screen's focus, not only `visible`.
 */
export const sheetOnScreen = (s: { mounted: boolean; focused: boolean }): boolean => s.mounted && s.focused

/** Blur closes an open sheet (its owner resets the state), so the sheet does not come back when the screen is focused again. */
export const closeOnBlur = (s: { visible: boolean; focused: boolean }): boolean => s.visible && !s.focused
