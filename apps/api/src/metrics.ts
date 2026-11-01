import type { PushData } from '@vaultme/contracts'
import type { Env } from './env.ts'

type Bindings = Env['Bindings']

/**
 * Workers Analytics Engine data points (Q56). `indexes[0]` is the event name, `blobs` are low-cardinality labels, `doubles` the numbers.
 * Never an address, install id, token or tx hash in any of them. Reading needs an owner token (not in this repo).
 * A write is non-blocking and must never fail a request, so an error is dropped.
 */
function point(env: Bindings, event: string, blobs: string[], doubles: number[]): void {
  try {
    env.ANALYTICS.writeDataPoint({ indexes: [event], blobs, doubles })
  } catch {
    // analytics is best effort
  }
}

/** blobs: route, status. doubles: duration in ms. */
export const recordRequest = (env: Bindings, route: string, status: number, durationMs: number): void =>
  point(env, 'request', [route, String(status)], [durationMs])

// A Worker invocation may write 250 data points at most (Cloudflare "Limits"), and one webhook or cron run can touch hundreds of
// tickets or receipts. So push data is written per group with a count, never per message.

/** blobs: push kind. doubles: seconds from the block timestamp to the Expo hand-off (Q26), and how many pushes had it. */
export const recordPushLatency = (env: Bindings, kind: PushData['kind'], seconds: number, count: number): void =>
  point(env, 'push_latency', [kind], [seconds, count])

/** blobs: `ok` or the Expo ticket error. doubles: how many tickets. */
export const recordPushTicket = (env: Bindings, outcome: string, count: number): void =>
  point(env, 'push_ticket', [outcome], [count])

/** blobs: `ok` or the Expo receipt error. doubles: how many receipts. */
export const recordPushReceipt = (env: Bindings, outcome: string, count: number): void =>
  point(env, 'push_receipt', [outcome], [count])
