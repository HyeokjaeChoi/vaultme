import { z } from 'zod'

// Error codes for the v1 API (LLD §4). Clients map any code they do not know to `Unknown` (Q61).
// Names are chosen here; LLD fixes only the shape and the 426/429/503 cases.
export const ERROR_CODES = [
  'invalid_request', // 400
  'origin_forbidden', // 403
  'not_found', // 404
  'update_required', // 426
  'rate_limited', // 429
  'internal', // 500
  'unavailable', // 503
] as const

export const ErrorCode = z.enum(ERROR_CODES)
export type ErrorCode = z.infer<typeof ErrorCode>

export const ErrorEnvelope = z
  .object({
    code: ErrorCode,
    message: z.string(),
    retryable: z.boolean(),
  })
  .meta({ id: 'ErrorEnvelope' })
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>

const RETRYABLE: Record<ErrorCode, boolean> = {
  invalid_request: false,
  origin_forbidden: false,
  not_found: false,
  update_required: false,
  rate_limited: true,
  internal: false,
  unavailable: true,
}

export const errorEnvelope = (code: ErrorCode, message: string): ErrorEnvelope => ({
  code,
  message,
  retryable: RETRYABLE[code],
})
