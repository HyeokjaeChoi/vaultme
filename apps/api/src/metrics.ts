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

/** blobs: push kind. doubles: seconds from the block timestamp to the Expo hand-off (Q26). */
export const recordPushLatency = (env: Bindings, kind: PushData['kind'], seconds: number): void =>
  point(env, 'push_latency', [kind], [seconds])

/** blobs: `ok` or the Expo ticket error. doubles: 1. */
export const recordPushTicket = (env: Bindings, outcome: string): void => point(env, 'push_ticket', [outcome], [1])

/** blobs: `ok` or the Expo receipt error. doubles: 1. */
export const recordPushReceipt = (env: Bindings, outcome: string): void => point(env, 'push_receipt', [outcome], [1])
