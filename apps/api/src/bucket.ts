import { DurableObject } from 'cloudflare:workers'
import {
  DAILY_WARN,
  SAVE_EVERY,
  count,
  refused,
  restore,
  secondsToMidnight,
  type Day,
  type Refused,
} from './daily-budget.ts'
import { logEvent } from './log.ts'

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

/** One global instance. The rate window is in memory on purpose: it is evicted only after being idle, when the window is empty anyway. The day count is stored. */
export class EtherscanBucket extends DurableObject {
  private b: Bucket = { starts: [] }
  private d: Day = { day: 0, calls: 0 }
  private warnedDay = -1 // the UTC day of the last warn line of this instance
  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env)
    void ctx.blockConcurrencyWhile(async () => {
      this.d = restore(await ctx.storage.get<Day>('day'))
    })
  }
  /** The ms to wait (0 = now), null when the wait would be over `maxWaitMs`, or a refusal when the day's budget is spent. Only a reserved call is counted. */
  acquire(maxWaitMs = MAX_WAIT_MS): number | null | Refused {
    const now = Date.now()
    if (refused(this.d, now)) return { refusedForSeconds: secondsToMidnight(now) }
    const wait = take(this.b, now, maxWaitMs)
    if (wait === null) return null
    this.d = count(this.d, now)
    // At or over, not equal: after a restart the count jumps by SAVE_EVERY and may skip 80,000. One line per day and instance.
    if (this.d.calls >= DAILY_WARN && this.warnedDay !== this.d.day) {
      this.warnedDay = this.d.day
      logEvent('warn', 'etherscan_daily_budget_warn', { calls: this.d.calls })
    }
    // The first call of a day is stored too: a restart on a new day must not fall back to yesterday's count.
    if (this.d.calls === 1 || this.d.calls % SAVE_EVERY === 0) void this.ctx.storage.put('day', this.d)
    return wait
  }
}
