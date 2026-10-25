import { describe, expect, it } from 'vitest'
import { apiErrorKey } from '../src/shared/api/errorCopy'
import { ApiError } from '@vaultme/api-client'
import { dayGroup, formatUpdated } from '../src/shared/lib/time'

// The list view itself (parse, poisoning filter, merge, cache fallback, race guard) is tested in packages/history.
describe('time labels', () => {
  const now = new Date(2026, 9, 14, 12, 0).getTime()
  it('today = HH:mm, other days = M월 D일 HH:mm', () => {
    expect(formatUpdated(new Date(2026, 9, 14, 9, 5).getTime(), now)).toBe('09:05')
    expect(formatUpdated(new Date(2026, 9, 13, 9, 12).getTime(), now)).toBe('10월 13일 09:12')
    expect(dayGroup(new Date(2026, 9, 14, 1, 0).getTime(), now)).toBe('today')
    expect(dayGroup(new Date(2026, 9, 12, 1, 0).getTime(), now)).toBe('10월 12일')
  })
})

describe('apiErrorKey', () => {
  const e = (code: ConstructorParameters<typeof ApiError>[0]) => new ApiError(code, 0, false, code)
  it('picks the copy by cause; unknown causes get the generic line', () => {
    expect(apiErrorKey(e('network'))).toBe('apiError.network')
    expect(apiErrorKey(e('unavailable'))).toBe('apiError.unavailable')
    expect(apiErrorKey(e('rate_limited'))).toBe('apiError.unavailable')
    expect(apiErrorKey(e('clock_skew'))).toBe('apiError.clockSkew')
    expect(apiErrorKey(e('Unknown'))).toBe('send.chainError')
    expect(apiErrorKey(new Error('x'))).toBe('send.chainError')
  })
})
