import type { ErrorCode } from '@vaultme/contracts'
import { errorEnvelope } from '@vaultme/contracts'
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export const fail = (c: Context, status: ContentfulStatusCode, code: ErrorCode, message: string) =>
  c.json(errorEnvelope(code, message), status)
