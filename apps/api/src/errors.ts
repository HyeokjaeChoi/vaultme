import type { ErrorCode } from '@vaultme/contracts'
import { errorEnvelope } from '@vaultme/contracts'
import type { Context, Input } from 'hono'
import type { Env } from './env.ts'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

// Generic over path and input so handlers of any route can pass their own Context without `any`.
export const fail = <P extends string, I extends Input>(
  c: Context<Env, P, I>,
  status: ContentfulStatusCode,
  code: ErrorCode,
  message: string,
) => c.json(errorEnvelope(code, message), status)

/** The cursor is malformed or belongs to another address: 400 `invalid_cursor`. */
export class InvalidCursorError extends Error {}

/**
 * Etherscan, Alchemy or Expo failed, was throttled or answered something unexpected: 503 `unavailable`. The message never holds URLs or bodies.
 * `retryAfterSeconds`: set when the cause will not clear before a known time (planned: the Etherscan daily budget of API-2, the seconds to 00:00 UTC; no caller yet).
 * `unavailable` turns it into the `Retry-After` header; without it the route's own default is used.
 * Throw it in the Worker, never inside a Durable Object: an error that crosses an RPC call is rebuilt without its class, so `instanceof`
 * fails and the route answers 500 (Cloudflare Workers "Error handling", read 2026-11-15). Return a value from the object instead.
 */
export class UpstreamError extends Error {
  readonly retryAfterSeconds: number | undefined
  // No parameter property: `node scripts/openapi.ts` strips types and cannot run one (same reason as StatusError in rpc.ts).
  constructor(message: string, retryAfterSeconds?: number) {
    super(message)
    this.retryAfterSeconds = retryAfterSeconds
  }
}

const RETRY_AFTER_MAX_SECONDS = 86_400 // one day: the longest wait is until 00:00 UTC

/**
 * The `Retry-After` header of a retryable 503 (API-3): whole seconds, 1 to 86,400, whatever number comes in (rounded up, clamped).
 * `fallbackSeconds` is the route's default wait; a `cause` that carries seconds wins, unless it is NaN. The 429 sets its own header (`rateLimited`, 60 s).
 */
const retryAfter = (fallbackSeconds: number, cause?: UpstreamError): { 'Retry-After': string } => {
  const given = cause?.retryAfterSeconds
  const seconds = given === undefined || Number.isNaN(given) ? fallbackSeconds : given
  return { 'Retry-After': String(Math.min(RETRY_AFTER_MAX_SECONDS, Math.max(1, Math.ceil(seconds)))) }
}

/** A retryable 503 `unavailable` with its `Retry-After`. Use this, not `fail(c, 503, ...)`, so no 503 goes out without the header (API-3). */
export const unavailable = <P extends string, I extends Input>(
  c: Context<Env, P, I>,
  message: string,
  fallbackSeconds: number,
  cause?: UpstreamError,
) => c.json(errorEnvelope('unavailable', message), 503, retryAfter(fallbackSeconds, cause))
