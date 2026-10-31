import { describe, expect, it } from 'vitest'
import { AddressInput, AmountInput, BackupAnswerInput, MnemonicWordInput } from '../src/index.ts'

const ok = (s: { safeParse: (v: unknown) => { success: boolean } }, v: string) => s.safeParse(v).success

describe('form input shapes', () => {
  it('AddressInput: 0x + 40 hex, any case', () => {
    expect(ok(AddressInput, '0x' + 'aB'.repeat(20))).toBe(true)
    expect(ok(AddressInput, '0x' + 'a'.repeat(39))).toBe(false)
    expect(ok(AddressInput, '0x' + 'g'.repeat(40))).toBe(false)
    expect(ok(AddressInput, 'a'.repeat(42))).toBe(false)
    expect(ok(AddressInput, '')).toBe(false)
  })
  it('AmountInput: digits, optional fraction, trailing dot allowed', () => {
    for (const v of ['0', '12', '0.5', '5.', '10.000001']) expect(ok(AmountInput, v)).toBe(true)
    for (const v of ['', '.', '.5', '1.2.3', '-1', '1e3', ' 1']) expect(ok(AmountInput, v)).toBe(false)
  })
  it('MnemonicWordInput: 3 to 8 lower-case letters', () => {
    for (const v of ['zoo', 'abandon', 'abstract']) expect(ok(MnemonicWordInput, v)).toBe(true)
    for (const v of ['', 'ab', 'abandoned', 'Abandon', 'ab1', 'a b']) expect(ok(MnemonicWordInput, v)).toBe(false)
  })
  it('BackupAnswerInput: not blank', () => {
    expect(ok(BackupAnswerInput, 'about')).toBe(true)
    expect(ok(BackupAnswerInput, '')).toBe(false)
    expect(ok(BackupAnswerInput, '   ')).toBe(false)
  })
})
