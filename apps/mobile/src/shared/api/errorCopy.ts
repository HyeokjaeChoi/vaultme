import { isApiError } from './errors'

/**
 * i18n key (title + body) for a failed API call. `update_required` is not here: it blocks the whole app (S91).
 * `unavailable` and `rate_limited` are the server saying "not now". Anything else, including codes this app does not know, gets the generic line.
 */
export function apiErrorKey(
  e: unknown,
): 'apiError.network' | 'apiError.unavailable' | 'apiError.clockSkew' | 'send.chainError' {
  if (isApiError(e, 'network')) return 'apiError.network'
  if (isApiError(e, 'clock_skew')) return 'apiError.clockSkew'
  if (isApiError(e, 'unavailable') || isApiError(e, 'rate_limited')) return 'apiError.unavailable'
  return 'send.chainError'
}
