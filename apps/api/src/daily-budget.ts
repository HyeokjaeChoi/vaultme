// The Etherscan day budget as pure functions; the Durable Object in bucket.ts holds the state.
// Daily budget (API-2). Etherscan blocks the free key at 100,000 calls a day (since 2026-11-03); the rate window alone allows 216,000. A refusal
// throws an `UpstreamError` with the seconds to 00:00 UTC in the Worker (etherscan.ts), and U3's `unavailable` turns it into `Retry-After`.
export const DAILY_WARN = 80_000
const DAILY_REFUSE = 95_000
// The count is stored every SAVE_EVERY calls, not every call: a SQLite Durable Object on Workers Free may write 100,000 rows a day, about the
// number of calls. After an eviction the stored count plus SAVE_EVERY is used, so a restart over-counts by at most SAVE_EVERY, never under-counts.
export const SAVE_EVERY = 50

/** The UTC day (days since 1970-01-01) and the calls counted in it. */
export type Day = { day: number; calls: number }
/** A refusal is a return value, not a throw: an error that crosses a Durable Object call is rebuilt without its class (errors.ts). */
export type Refused = { refusedForSeconds: number }

const DAY_MS = 86_400_000
const utcDay = (now: number): number => Math.floor(now / DAY_MS)
/** Seconds to the next 00:00 UTC: 1 to 86,400. */
export const secondsToMidnight = (now: number): number => 86_400 - (Math.floor(now / 1000) % 86_400)
export const refused = (d: Day, now: number): boolean => d.day === utcDay(now) && d.calls >= DAILY_REFUSE
/** One more call; a new UTC day starts at 0. */
export const count = (d: Day, now: number): Day =>
  d.day === utcDay(now) ? { day: d.day, calls: d.calls + 1 } : { day: utcDay(now), calls: 1 }
export const restore = (saved: Day | undefined): Day =>
  saved === undefined ? { day: 0, calls: 0 } : { day: saved.day, calls: saved.calls + SAVE_EVERY }
