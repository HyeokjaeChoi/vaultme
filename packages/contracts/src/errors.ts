import { z } from 'zod'

// Error codes for the v1 API (LLD §4). Clients map any code they do not know to `Unknown` (Q61).
// Names are chosen here; LLD fixes only the shape and the 426/429/503 cases.
export const ERROR_CODES = [
  'invalid_request', // 400
  'origin_forbidden', // 403
  'method_not_allowed', // 403, JSON-RPC method or eth_call target outside the allow-list
  'unauthorized', // 401 missing, bad or expired token; unknown install
  'signature_invalid', // 401
  'nonce_reused', // 401
  'clock_skew', // 401, client clock is off by more than CLOCK_SKEW_SECONDS
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
  method_not_allowed: false,
  unauthorized: false,
  signature_invalid: false,
  nonce_reused: false,
  clock_skew: false,
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
