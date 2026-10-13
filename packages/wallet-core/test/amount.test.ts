import fc from 'fast-check'
import { describe, expect, test } from 'vitest'
import { AmountError, fromUnits, maxSendable, toUnits, type AssetId } from '../src'

const assets: AssetId[] = ['ETH', 'USDC']
const decimals = { ETH: 18, USDC: 6 } as const

describe('toUnits / fromUnits', () => {
  test('examples', () => {
    expect(toUnits('1', 'USDC')).toBe(1_000_000n)
    expect(toUnits('0.000001', 'USDC')).toBe(1n)
    expect(toUnits('1.5', 'ETH')).toBe(1_500_000_000_000_000_000n)
    expect(fromUnits(1n, 'USDC')).toBe('0.000001')
    expect(fromUnits(1_500_000n, 'USDC')).toBe('1.5')
    expect(fromUnits(0n, 'ETH')).toBe('0')
  })
  test('rejects too many decimals, no rounding', () => {
    expect(() => toUnits('0.0000001', 'USDC')).toThrow(AmountError)
    expect(() => toUnits('1.0000000', 'USDC')).toThrow(AmountError)
  })
  test.each(['-1', '+1', '', ' ', '1.', '.5', '1e3', '0x10', 'abc', '1,5', '1 2', 'NaN', 'Infinity', '１'])(
    'rejects garbage %j',
    (s) => expect(() => toUnits(s, 'ETH')).toThrow(AmountError),
  )
  test('round trip raw -> string -> raw (property)', () => {
    fc.assert(
      fc.property(fc.constantFrom(...assets), fc.bigInt({ min: 0n, max: 2n ** 128n }), (a, raw) => {
        expect(toUnits(fromUnits(raw, a), a)).toBe(raw)
      }),
    )
  })
  test('round trip string -> raw -> string, canonical form (property)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...assets),
        fc.bigInt({ min: 0n, max: 10n ** 12n }),
        fc.bigInt({ min: 0n, max: 10n ** 18n - 1n }),
        (a, whole, fracSeed) => {
          const d = decimals[a]
          const frac = (fracSeed % 10n ** BigInt(d)).toString().padStart(d, '0').replace(/0+$/, '')
          const s = frac ? `${whole}.${frac}` : `${whole}`
          expect(fromUnits(toUnits(s, a), a)).toBe(s)
        },
      ),
    )
  })
})

describe('maxSendable', () => {
  test('ETH subtracts fee cap; floors at zero', () => {
    expect(maxSendable(10n, 'ETH', 3n, 10n)).toEqual({ ok: true, amount: 7n })
    expect(maxSendable(3n, 'ETH', 3n, 3n)).toEqual({ ok: true, amount: 0n })
    expect(maxSendable(1n, 'ETH', 3n, 1n)).toEqual({ ok: true, amount: 0n })
  })
  test('USDC needs native for fee', () => {
    expect(maxSendable(500n, 'USDC', 3n, 2n)).toEqual({ ok: false, reason: 'nativeFeeShortfall' })
    expect(maxSendable(500n, 'USDC', 3n, 3n)).toEqual({ ok: true, amount: 500n })
  })
  test('never exceeds balance; ETH amount + fee <= balance (property)', () => {
    const big = fc.bigInt({ min: 0n, max: 2n ** 100n })
    fc.assert(
      fc.property(fc.constantFrom(...assets), big, big, big, (a, bal, fee, native) => {
        const r = maxSendable(bal, a, fee, native)
        if (!r.ok) return
        expect(r.amount <= bal).toBe(true)
        if (a === 'ETH' && r.amount > 0n) expect(r.amount + fee <= bal).toBe(true)
      }),
    )
  })
})
