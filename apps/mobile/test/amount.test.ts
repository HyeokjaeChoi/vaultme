import { expect, it } from 'vitest'
import { applyKey, isZeroAmount } from '../src/shared/lib/amount'
import { isAddressFormat, shortAddress } from '../src/shared/lib/address'

it('digits replace the leading zero and append otherwise', () => {
  expect(applyKey('0', '5')).toBe('5')
  expect(applyKey('0.05', '1')).toBe('0.051')
  expect(applyKey('0', '0')).toBe('0')
})
it('dot is added once', () => {
  expect(applyKey('0', '.')).toBe('0.')
  expect(applyKey('0.5', '.')).toBe('0.5')
})
it('backspace removes one character and floors at 0', () => {
  expect(applyKey('0.05', 'backspace')).toBe('0.0')
  expect(applyKey('5', 'backspace')).toBe('0')
  expect(applyKey('0', 'backspace')).toBe('0')
})
it('stops at the max length', () => {
  expect(applyKey('123456789012', '3')).toBe('123456789012')
})
it('zero check ignores dots and zeros', () => {
  expect(isZeroAmount('0')).toBe(true)
  expect(isZeroAmount('0.00')).toBe(true)
  expect(isZeroAmount('0.01')).toBe(false)
})
it('short address (EIP-55 form) keeps 6 leading and 4 trailing characters', () => {
  expect(shortAddress('0x9F3c7A210bD4e6C855a13F90c2E78d16Ab0441aB')).toBe('0x9F3C…41Ab')
})
it('address format needs 0x and 40 hex characters', () => {
  expect(isAddressFormat('0x9F3c7A210bD4e6C855a13F90c2E78d16Ab0441aB')).toBe(true)
  expect(isAddressFormat('0x9F3c')).toBe(false)
  expect(isAddressFormat('9F3c7A210bD4e6C855a13F90c2E78d16Ab0441aBxx')).toBe(false)
})

it('exceedsBalance compares amount with available', async () => {
  const { exceedsBalance } = await import('../src/shared/lib/amount')
  expect(exceedsBalance('999', '1.284732')).toBe(true)
  expect(exceedsBalance('1.284732', '1.284732')).toBe(false)
  expect(exceedsBalance('5.', '1.284732')).toBe(true)
  expect(exceedsBalance('0.05', '1.284732')).toBe(false)
})

it('showAmount: floor in lists, exact elsewhere, unknown asset untouched', async () => {
  const { showAmount } = await import('../src/shared/lib/amount')
  expect(showAmount('1.2847329', 'ETH', 'floor')).toBe('1.284732 ETH')
  expect(showAmount('1.2847329', 'ETH', 'exact')).toBe('1.2847329 ETH')
  expect(showAmount('1.5', 'USDC', 'exact')).toBe('1.5 USDC')
  expect(showAmount('0.001', 'USDC', 'floor')).toBe('<0.01 USDC')
  expect(showAmount('3', 'DAI', 'floor')).toBe('3 DAI')
})

it('00 adds two zeros at once', () => {
  expect(applyKey('1', '00')).toBe('100')
  expect(applyKey('0', '00')).toBe('0')
})
