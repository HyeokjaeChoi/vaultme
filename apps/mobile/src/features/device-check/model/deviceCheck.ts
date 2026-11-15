export type DeviceCheckDeps = {
  /** `JailMonkey.isJailBroken()` (jail-monkey 3.0.0, sync, iOS and Android). */
  isRooted: () => boolean
  wasShown: () => boolean
}

/**
 * Decides whether to raise the B-S92 warning (ADR-0048). Advisory only: the result never blocks the app.
 * True only when jail-monkey says rooted/jailbroken and the screen was not shown before. The caller saves "shown" after it opened the screen.
 * A check that throws or says false shows nothing and is tried again at the next launch.
 */
export function shouldWarnDevice(d: DeviceCheckDeps): boolean {
  if (d.wasShown()) return false
  try {
    return d.isRooted()
  } catch {
    return false
  }
}
