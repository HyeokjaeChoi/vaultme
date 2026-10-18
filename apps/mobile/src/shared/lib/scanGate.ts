/**
 * Repeat guard for the QR camera (issue #64 review P1-2). The camera reports the code in view every frame, so a code is handled once:
 * again only when a different code is seen, or when this one was out of view for longer than `quietMs`. `touch` marks "still looking at it"
 * while detection is paused (e.g. the chain-mismatch sheet is open), so closing the sheet does not reopen it for the same code.
 */
export const SCAN_QUIET_MS = 1500

export function createScanGate(quietMs: number = SCAN_QUIET_MS) {
  let data: string | null = null
  let seenAt = 0
  return {
    /** true = handle this frame's code; false = the same code is still in view. */
    accept(code: string, now: number): boolean {
      const same = code === data && now - seenAt <= quietMs
      data = code
      seenAt = now
      return !same
    },
    /** Counts the current code as seen now without a new frame. */
    touch(now: number): void {
      if (data !== null) seenAt = now
    },
  }
}
