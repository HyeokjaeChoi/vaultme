import { DurableObject } from 'cloudflare:workers'
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

// Daily budget (API-2). Etherscan blocks the free key at 100,000 calls a day (since 2026-11-03); the rate window alone allows 216,000. A refusal
// throws an `UpstreamError` with the seconds to 00:00 UTC in the Worker (etherscan.ts), and U3's `unavailable` turns it into `Retry-After`.
export const DAILY_WARN = 80_000
export const DAILY_REFUSE = 95_000
// The count is stored every SAVE_EVERY calls, not every call: a SQLite Durable Object on Workers Free may write 100,000 rows a day, about the
// number of calls. After an eviction the stored count plus SAVE_EVERY is used, so a restart over-counts by at most SAVE_EVERY, never under-counts.
export const SAVE_EVERY = 50

/** The UTC day (days since 1970-01-01) and the calls counted in it. */
export type Day = { day: number; calls: number }
/** A refusal is a return value, not a throw: an error that crosses a Durable Object call is rebuilt without its class (errors.ts). */
export type Refused = { refusedForSeconds: number }

const DAY_MS = 86_400_000
export const utcDay = (now: number): number => Math.floor(now / DAY_MS)
/** Seconds to the next 00:00 UTC: 1 to 86,400. */
export const secondsToMidnight = (now: number): number => 86_400 - (Math.floor(now / 1000) % 86_400)
export const refused = (d: Day, now: number): boolean => d.day === utcDay(now) && d.calls >= DAILY_REFUSE
/** One more call; a new UTC day starts at 0. */
export const count = (d: Day, now: number): Day =>
  d.day === utcDay(now) ? { day: d.day, calls: d.calls + 1 } : { day: utcDay(now), calls: 1 }
export const restore = (saved: Day | undefined): Day =>
  saved === undefined ? { day: 0, calls: 0 } : { day: saved.day, calls: saved.calls + SAVE_EVERY }

/** One global instance. The rate window is in memory on purpose: it is evicted only after being idle, when the window is empty anyway. The day count is stored. */
export class EtherscanBucket extends DurableObject {
  private b: Bucket = { starts: [] }
  private d: Day = { day: 0, calls: 0 }
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
    if (this.d.calls === DAILY_WARN) logEvent('warn', 'etherscan_daily_budget_warn', { calls: this.d.calls })
    if (this.d.calls % SAVE_EVERY === 0) void this.ctx.storage.put('day', this.d)
    return wait
  }
}
