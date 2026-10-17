import { describe, expect, it } from 'vitest'
import { pressKey } from '../src/shared/lib/amount'

describe('pressKey (sendable max)', () => {
  it('rejects a key that would exceed the sendable max, amount unchanged', () => {
    expect(pressKey('0.9', '6', '0.95')).toEqual({ amount: '0.9', accepted: false, overMax: true })
    expect(pressKey('1', '0', '1')).toEqual({ amount: '1', accepted: false, overMax: true }) // "10" > 1
  })

  it('accepts a key that stays at or under the max', () => {
    expect(pressKey('0.9', '4', '0.95')).toEqual({ amount: '0.94', accepted: true, overMax: false })
    expect(pressKey('0.9', '5', '0.95')).toEqual({ amount: '0.95', accepted: true, overMax: false }) // equal to the max is allowed
    expect(pressKey('0.', '9', '0.95').accepted).toBe(true)
  })

  it('backspace is always accepted, even above the max', () => {
    expect(pressKey('12', 'backspace', '1')).toEqual({ amount: '1', accepted: true, overMax: false })
  })

  it('no known max = no over-max rejection; other no-ops are rejected without overMax', () => {
    expect(pressKey('5', '5', null)).toEqual({ amount: '55', accepted: true, overMax: false })
    expect(pressKey('1.5', '.', '9')).toEqual({ amount: '1.5', accepted: false, overMax: false })
  })
})
