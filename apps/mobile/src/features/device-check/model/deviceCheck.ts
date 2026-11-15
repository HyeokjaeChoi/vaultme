export type DeviceCheckDeps = {
  /** `JailMonkey.isJailBroken()` (jail-monkey 3.0.0, sync, iOS and Android). */
  isRooted: () => boolean
  wasShown: () => boolean
  markShown: () => void
}

/**
 * Decides whether to raise the B-S92 warning (ADR-0050). Advisory only: the result never blocks the app.
 * True once per install: only when jail-monkey says rooted/jailbroken and the screen was not shown before.
 * A check that throws or says false shows nothing and is tried again at the next launch.
 */
export function shouldWarnDevice(d: DeviceCheckDeps): boolean {
  if (d.wasShown()) return false
  try {
    if (!d.isRooted()) return false
  } catch {
    return false
  }
  d.markShown()
  return true
}
