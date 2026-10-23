import type { ErrorCode } from '@vaultme/contracts'

/** `network` = the request never got an answer. `Unknown` = a code or body this app does not know (Q61). */
export type ApiErrorCode = ErrorCode | 'network' | 'Unknown'

/** Typed API failure. The UI branches on `code`: `update_required` -> S91 (#44), `clock_skew` -> clock hint. */
export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly status: number,
    readonly retryable: boolean,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** JSON-RPC error inside a 200 answer (the node answered, the call failed). */
export class RpcError extends Error {
  constructor(
    readonly rpcCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'RpcError'
  }
}

export const isApiError = (e: unknown, code?: ApiErrorCode): e is ApiError =>
  e instanceof ApiError && (code === undefined || e.code === code)
