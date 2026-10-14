import { describe, expect, it } from 'vitest'
import { AppVersion, canonicalString, ErrorEnvelope, HistoryRequest, HistoryResponse, errorEnvelope, isBelow } from '../src/index.ts'

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
  it('history response and the invalid_cursor error', () => {
    expect(HistoryResponse.safeParse({ items: [], nextCursor: null, incomplete: false }).success).toBe(true)
    expect(HistoryResponse.safeParse({ items: [] }).success).toBe(false)
    expect(errorEnvelope('invalid_cursor', 'x')).toEqual({ code: 'invalid_cursor', message: 'x', retryable: false })
  })
  it('canonical string test vector', () => {
    // The mobile client (#43) must reproduce this exact string.
    expect(
      canonicalString({
        method: 'post',
        path: '/v1/installs/token',
        installId: '123e4567-e89b-42d3-a456-426614174000',
        ts: 1760400000,
        nonce: 'AAAAAAAAAAAAAAAAAAAAAA',
        bodySha256Hex: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      }),
    ).toBe(
      'vaultme-v1\nPOST\n/v1/installs/token\n123e4567-e89b-42d3-a456-426614174000\n1760400000\nAAAAAAAAAAAAAAAAAAAAAA\ne3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    )
  })
})
