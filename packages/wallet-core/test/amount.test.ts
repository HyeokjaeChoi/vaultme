import fc from 'fast-check'
import { describe, expect, test } from 'vitest'
import { AmountError, chipAmount, fromUnits, maxSendable, toUnits, type AssetId } from '../src'

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
          const s = frac ? `${String(whole)}.${frac}` : String(whole)
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

describe('chipAmount', () => {
  const eth = (s: string) => toUnits(s, 'ETH')
  test('ETH 전액 = balance - fee cap, floored to 6 display digits', () => {
    // 1.284732 - 0.0000735 = 1.2846585 -> 1.284658 (floor, not round)
    expect(chipAmount('ETH', 100, eth('1.284732'), eth('0.0000735'), eth('1.284732'))).toBe(eth('1.284658'))
  })
  test('ETH 25% and 50% are shares of the sendable amount, floored', () => {
    expect(chipAmount('ETH', 50, eth('1.284732'), eth('0.0000735'), eth('1.284732'))).toBe(eth('0.642329')) // 0.64232925 -> floor
    expect(chipAmount('ETH', 25, eth('1.284732'), eth('0.0000735'), eth('1.284732'))).toBe(eth('0.321164')) // 0.3211646.. -> floor
  })
  test('ETH balance at or below the fee cap -> 0 (chip disabled)', () => {
    expect(chipAmount('ETH', 100, eth('0.0000735'), eth('0.0000735'), eth('0.0000735'))).toBe(0n)
    expect(chipAmount('ETH', 100, eth('0.00001'), eth('0.0000735'), eth('0.00001'))).toBe(0n)
  })
  test('USDC: shares of the balance, floored to 2 digits; no native for the fee -> 0', () => {
    const usdc = (s: string) => toUnits(s, 'USDC')
    expect(chipAmount('USDC', 100, usdc('250.00'), eth('0.0000735'), eth('1'))).toBe(usdc('250'))
    expect(chipAmount('USDC', 50, usdc('12.51'), eth('0.0000735'), eth('1'))).toBe(usdc('6.25')) // 6.255 -> 6.25
    expect(chipAmount('USDC', 100, usdc('250'), eth('0.0000735'), eth('0.00001'))).toBe(0n)
  })
  test('floor never exceeds the share and stays on the display grid (property)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...assets),
        fc.constantFrom(25 as const, 50 as const, 100 as const),
        fc.bigInt({ min: 0n, max: 2n ** 90n }),
        fc.bigInt({ min: 0n, max: 2n ** 60n }),
        (a, pct, bal, cap) => {
          const got = chipAmount(a, pct, bal, cap, bal + cap)
          const m = maxSendable(bal, a, cap, bal + cap)
          const max = m.ok ? m.amount : 0n
          expect(got <= (max * BigInt(pct)) / 100n).toBe(true)
          expect(got % 10n ** BigInt(decimals[a] - (a === 'ETH' ? 6 : 2))).toBe(0n)
        },
      ),
    )
  })
})
