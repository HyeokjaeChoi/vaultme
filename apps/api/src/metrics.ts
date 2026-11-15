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

/**
 * One `/v1/rpc` request (API-4). blobs: method, outcome (`ok` or `unavailable`), the upstream that answered (`infura`, `alchemy`, `none`) and
 * `1` when the hedge timer fired. doubles: duration in ms, Infura calls, Alchemy calls. Calls and the method are kept, not credits or compute
 * units: the weekly read applies the price lists, so a price change needs no deploy. Never params, an address or a hash.
 */
export const recordRpc = (
  env: Bindings,
  method: string,
  outcome: 'ok' | 'unavailable',
  winner: 'infura' | 'alchemy' | 'none',
  hedged: boolean,
  durationMs: number,
  infuraCalls: number,
  alchemyCalls: number,
): void => point(env, 'rpc', [method, outcome, winner, hedged ? '1' : '0'], [durationMs, infuraCalls, alchemyCalls])

/** One history cache miss (API-4). blobs: `ok` or `unavailable`. doubles: Etherscan calls made (retries included), duration in ms. Never the address. */
export const recordHistoryMiss = (
  env: Bindings,
  outcome: 'ok' | 'unavailable',
  calls: number,
  durationMs: number,
): void => point(env, 'history_miss', [outcome], [calls, durationMs])

/** blobs: push kind. doubles: seconds from the block timestamp to the Expo hand-off (Q26), and how many pushes had it. */
export const recordPushLatency = (env: Bindings, kind: PushData['kind'], seconds: number, count: number): void =>
  point(env, 'push_latency', [kind], [seconds, count])

/** blobs: `ok` or the Expo ticket error. doubles: how many tickets. */
export const recordPushTicket = (env: Bindings, outcome: string, count: number): void =>
  point(env, 'push_ticket', [outcome], [count])

/** blobs: `ok` or the Expo receipt error. doubles: how many receipts. */
export const recordPushReceipt = (env: Bindings, outcome: string, count: number): void =>
  point(env, 'push_receipt', [outcome], [count])
