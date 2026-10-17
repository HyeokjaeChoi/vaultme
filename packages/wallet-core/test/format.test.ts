import { describe, expect, test } from 'vitest'
import { formatAmount, formatDecimal, toUnits } from '../src'

const eth = (s: string) => toUnits(s, 'ETH')
const usdc = (s: string) => toUnits(s, 'USDC')

describe('formatAmount floor (balances, list rows)', () => {
  test('ETH: up to 6 digits, trailing zeros trimmed, never rounded up', () => {
    expect(formatAmount(eth('1.284732'), 'ETH', 'floor')).toBe('1.284732')
    expect(formatAmount(eth('1.2847329999'), 'ETH', 'floor')).toBe('1.284732')
    expect(formatAmount(eth('1.5'), 'ETH', 'floor')).toBe('1.5')
    expect(formatAmount(eth('2'), 'ETH', 'floor')).toBe('2')
    expect(formatAmount(eth('0.0500009999'), 'ETH', 'floor')).toBe('0.05')
    expect(formatAmount(0n, 'ETH', 'floor')).toBe('0')
  })
  test('USDC: up to 2 digits, floored, trailing zeros trimmed (Figma "12.5 USDC")', () => {
    expect(formatAmount(usdc('250'), 'USDC', 'floor')).toBe('250')
    expect(formatAmount(usdc('1.999999'), 'USDC', 'floor')).toBe('1.99')
    expect(formatAmount(usdc('0.5'), 'USDC', 'floor')).toBe('0.5')
    expect(formatAmount(0n, 'USDC', 'floor')).toBe('0')
  })
  test('tiny non-zero values', () => {
    expect(formatAmount(eth('0.0000001'), 'ETH', 'floor')).toBe('<0.000001')
    expect(formatAmount(1n, 'ETH', 'floor')).toBe('<0.000001')
    expect(formatAmount(eth('0.000001'), 'ETH', 'floor')).toBe('0.000001')
    expect(formatAmount(usdc('0.009999'), 'USDC', 'floor')).toBe('<0.01')
    expect(formatAmount(usdc('0.01'), 'USDC', 'floor')).toBe('0.01')
  })
  test('never shows more than owned', () => {
    for (const s of ['0.1234569', '9.9999999', '0.0000019', '123456.7890123']) {
      const raw = eth(s)
      const shown = formatAmount(raw, 'ETH', 'floor')
      if (!shown.startsWith('<')) expect(toUnits(shown, 'ETH') <= raw).toBe(true)
    }
  })
})

describe('formatAmount exact (Review, result, detail)', () => {
  test('every digit, trailing zeros trimmed', () => {
    expect(formatAmount(eth('0.05'), 'ETH', 'exact')).toBe('0.05')
    expect(formatAmount(eth('0.000042'), 'ETH', 'exact')).toBe('0.000042')
    expect(formatAmount(eth('1.2847329999'), 'ETH', 'exact')).toBe('1.2847329999')
    expect(formatAmount(usdc('1.5'), 'USDC', 'exact')).toBe('1.5')
    expect(formatAmount(usdc('1.234567'), 'USDC', 'exact')).toBe('1.234567')
    expect(formatAmount(1n, 'ETH', 'exact')).toBe('0.000000000000000001')
    expect(formatAmount(0n, 'ETH', 'exact')).toBe('0')
  })
})

describe('formatDecimal', () => {
  test('goes through the same rules; unparseable input is returned as is', () => {
    expect(formatDecimal('1.5', 'USDC', 'exact')).toBe('1.5')
    expect(formatDecimal('0.123456789', 'ETH', 'floor')).toBe('0.123456')
    expect(formatDecimal('abc', 'ETH', 'floor')).toBe('abc')
    expect(formatDecimal('1.0000001', 'USDC', 'exact')).toBe('1.0000001') // more digits than USDC has: left alone
  })
})
