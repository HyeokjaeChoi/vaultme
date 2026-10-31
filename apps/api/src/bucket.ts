import { DurableObject } from 'cloudflare:workers'

// Etherscan free tier: 3 calls/s per key (https://docs.etherscan.io/rate-limits). We allow BURST calls in any WINDOW_MS:
// 3 per 1200 ms = 2.5/s on average, and never more than 3 in any second. A 3-call history page starts all its calls at once.
// A continuous token bucket with 3 tokens is NOT the same: it refills while the burst is in flight and let 5 calls fall in
// one second (seen live as `rate limit` answers). A rolling window frees a slot only after the window has passed.
// The 200 ms above 1 s covers network jitter between our send time and Etherscan's receive time.
export const BURST = 3
export const WINDOW_MS = 1200
export const MAX_WAIT_MS = 2000

/** Start times (ms) of the last BURST reserved calls, oldest first. A reserved start may be in the future. */
export type Bucket = { starts: number[] }

/**
 * Reserves one call slot. Returns the ms the caller must wait before calling Etherscan (0 = now), or null when the wait
 * would exceed `maxWaitMs`. A waiting caller reserves its slot now, so waits queue up.
 */
export function take(b: Bucket, now: number, maxWaitMs = MAX_WAIT_MS): number | null {
  const oldest = b.starts.length < BURST ? -Infinity : (b.starts[0] ?? -Infinity)
  const start = Math.max(now, oldest + WINDOW_MS)
  if (start - now > maxWaitMs) return null
  b.starts = [...b.starts, start].slice(-BURST)
  return start - now
}

/** One global instance. In-memory on purpose: it is evicted only after being idle, when the window is empty anyway. */
export class EtherscanBucket extends DurableObject {
  private b: Bucket = { starts: [] }
  acquire(maxWaitMs = MAX_WAIT_MS): number | null {
    return take(this.b, Date.now(), maxWaitMs)
  }
}
