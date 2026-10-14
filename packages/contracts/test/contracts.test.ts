import { describe, expect, it } from 'vitest'
import { AppVersion, ErrorEnvelope, HistoryRequest, errorEnvelope, isBelow } from '../src/index.ts'

describe('contracts', () => {
  it('builds a valid error envelope', () => {
    const e = errorEnvelope('unavailable', 'later')
    expect(ErrorEnvelope.parse(e)).toEqual({ code: 'unavailable', message: 'later', retryable: true })
  })
  it('compares versions', () => {
    expect(isBelow('1.2.3', '1.10.0')).toBe(true)
    expect(isBelow('1.10', '1.2.9')).toBe(false)
    expect(isBelow('1.0.0', '1')).toBe(false)
    expect(AppVersion.safeParse('1.x').success).toBe(false)
  })
  it('validates the history body', () => {
    expect(HistoryRequest.safeParse({ address: '0x' + 'a'.repeat(40) }).success).toBe(true)
    expect(HistoryRequest.safeParse({ address: '0x12' }).success).toBe(false)
  })
})
