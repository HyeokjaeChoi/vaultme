export type DeviceCheckDeps = {
  /** `Device.isRootedExperimentalAsync()`. */
  isRooted: () => Promise<boolean>
  wasShown: () => boolean
  markShown: () => void
}

/**
 * Decides whether to raise the B-S92 warning (ADR-0028). Warn only: the result never blocks the app.
 * True once per install: only when the experimental check says rooted/jailbroken and the screen was not shown before.
 * A check that throws or says false shows nothing and is tried again at the next launch.
 */
export async function shouldWarnDevice(d: DeviceCheckDeps): Promise<boolean> {
  if (d.wasShown()) return false
  try {
    if (!(await d.isRooted())) return false
    d.markShown()
    return true
  } catch {
    return false
  }
}
