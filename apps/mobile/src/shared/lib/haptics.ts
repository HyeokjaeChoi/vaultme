import * as Haptics from 'expo-haptics'

/**
 * Haptic cues from the Figma notes (redesign-b.md §9.3): keypad and chip selection, copy, risk sheet warning, success, failure.
 * Reduce Motion turns motion off, not haptics, so nothing here reads that setting. A device without a haptic engine ignores the call.
 */
const run = (p: Promise<void>) => void p.catch(() => undefined)

export const haptic = {
  select: () => run(Haptics.selectionAsync()),
  copy: () => run(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  warning: () => run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  success: () => run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
}

/** Keypad cue: a rejected key (or one that made the amount too big) gives the warning cue, never the selection one. `undefined` = accepted. */
export const keyHaptic = (accepted: boolean | void) => (accepted === false ? haptic.warning() : haptic.select())
