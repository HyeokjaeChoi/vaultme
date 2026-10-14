import { DurableObject } from 'cloudflare:workers'

// Etherscan free tier: 3 calls/s per key. We use 2.5/s (LLD §5.1). Burst = one history page (3 calls).
export const RATE_PER_SEC = 2.5
export const BURST = 3
export const MAX_WAIT_MS = 2000

export type Bucket = { tokens: number; at: number }

/**
 * Takes one token. Returns the ms the caller must wait before calling Etherscan (0 = now), or null when the wait
 * would exceed `maxWaitMs`. A waiting caller reserves its token now (balance goes negative), so waits queue up.
 */
export function take(b: Bucket, now: number, maxWaitMs = MAX_WAIT_MS): number | null {
  b.tokens = Math.min(BURST, b.tokens + ((now - b.at) * RATE_PER_SEC) / 1000)
  b.at = now
  if (b.tokens >= 1) {
    b.tokens -= 1
    return 0
  }
  const wait = Math.ceil(((1 - b.tokens) / RATE_PER_SEC) * 1000)
  if (wait > maxWaitMs) return null
  b.tokens -= 1
  return wait
}

/** One global instance. In-memory on purpose: it is evicted only after being idle, when the bucket is full anyway. */
export class EtherscanBucket extends DurableObject {
  private b: Bucket = { tokens: BURST, at: Date.now() }
  acquire(maxWaitMs = MAX_WAIT_MS): number | null {
    return take(this.b, Date.now(), maxWaitMs)
  }
}
