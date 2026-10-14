import type { ErrorCode } from '@vaultme/contracts'
import { errorEnvelope } from '@vaultme/contracts'
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export const fail = (c: Context, status: ContentfulStatusCode, code: ErrorCode, message: string) =>
  c.json(errorEnvelope(code, message), status)

/** The cursor is malformed or belongs to another address: 400 `invalid_cursor`. */
export class InvalidCursorError extends Error {}

/** Etherscan failed, was throttled or answered something unexpected: 503 `unavailable`. The message never holds URLs or bodies. */
export class UpstreamError extends Error {}
