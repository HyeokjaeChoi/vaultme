import { inspect } from 'node:util'
import { describe, expect, test } from 'vitest'
import { deriveAddress, generateMnemonic, isMnemonicWord, toMnemonic, validateMnemonic, Mnemonic } from '../src'
import { mnemonicToSeedSync } from '@scure/bip39'
import {
  BIP39_12,
  BIP39_12_ADDRESS,
  BIP39_12_TREZOR_ADDRESS,
  BIP39_12_TREZOR_SEED,
  BIP39_24,
  TREZOR_PASSPHRASE,
  PUBLIC_JUNK_ADDRESS,
  PUBLIC_JUNK_PHRASE,
} from './fixtures'

describe('Mnemonic masking', () => {
  const m = new Mnemonic(PUBLIC_JUNK_PHRASE)
  test('no printing path reveals words', () => {
    const outs = [
      String(m),
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- the implicit string paths are what this test checks
      `${m}`,
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands -- same: implicit coercion must stay masked
      m + '',
      JSON.stringify(m),
      JSON.stringify({ m }),
      inspect(m),
      inspect({ nested: [m] }, { depth: 5 }),
      Object.keys(m).join(),
      JSON.stringify(Object.getOwnPropertyNames(m)),
    ]
    for (const o of outs) expect(o).not.toContain('test test')
    expect(outs.join(' ')).not.toContain('junk')
  })
  test('reveal() is the only way out', () => expect(m.reveal()).toBe(PUBLIC_JUNK_PHRASE))
})

describe('validateMnemonic', () => {
  test('ok for 12 and 24 words', () => {
    expect(validateMnemonic(BIP39_12)).toEqual({ kind: 'ok' })
    expect(validateMnemonic(BIP39_24)).toEqual({ kind: 'ok' })
    expect(validateMnemonic(`  ${BIP39_12.toUpperCase()} \n`)).toEqual({ kind: 'ok' })
  })
  test('wrongLength', () => {
    expect(validateMnemonic('abandon abandon')).toEqual({ kind: 'wrongLength', count: 2 })
    expect(validateMnemonic('')).toEqual({ kind: 'wrongLength', count: 0 })
  })
  test('unknownWord reports the index', () => {
    const bad = BIP39_12.replace(/^((\S+ ){4})\S+/, '$1zzzzzz')
    expect(validateMnemonic(bad)).toEqual({ kind: 'unknownWord', index: 4 })
  })
  test('badChecksum', () => {
    expect(validateMnemonic(BIP39_12.replace(/about$/, 'abandon'))).toEqual({ kind: 'badChecksum' })
  })
})

describe('isMnemonicWord', () => {
  test('wordlist membership', () => {
    expect(isMnemonicWord('abandon')).toBe(true)
    expect(isMnemonicWord('zoo')).toBe(true)
    expect(isMnemonicWord('abcd')).toBe(false)
    expect(isMnemonicWord('')).toBe(false)
  })
})

describe('generate / derive', () => {
  test('generated phrase has 12 valid words and is masked', () => {
    const m = generateMnemonic()
    expect(m.reveal().split(' ')).toHaveLength(12)
    expect(validateMnemonic(m.reveal())).toEqual({ kind: 'ok' })
    expect(generateMnemonic().reveal()).not.toBe(m.reveal())
  })
  test('toMnemonic rejects invalid phrase', () => {
    expect(toMnemonic('nope')).toBeNull()
    expect(toMnemonic(BIP39_12)?.reveal()).toBe(BIP39_12)
  })
  test('published vector: junk phrase -> Anvil account 0 (viem test suite, see fixtures.ts)', () => {
    expect(deriveAddress(new Mnemonic(PUBLIC_JUNK_PHRASE))).toBe(PUBLIC_JUNK_ADDRESS)
  })
  test('BIP39 "abandon..about" derivation is stable (expected value NOT verified against a source)', () => {
    const a = deriveAddress(new Mnemonic(BIP39_12))
    expect(a).toMatch(/^0x[0-9a-fA-F]{40}$/)
    expect(a).toBe(BIP39_12_ADDRESS)
  })
})

describe('BIP39 passphrase', () => {
  const hex = (b: Uint8Array) => Buffer.from(b).toString('hex')
  test('official seed vector with "TREZOR"', () => {
    expect(hex(mnemonicToSeedSync(BIP39_12, TREZOR_PASSPHRASE))).toBe(BIP39_12_TREZOR_SEED)
  })
  test('empty passphrase = no passphrase', () => {
    expect(deriveAddress(new Mnemonic(BIP39_12, ''))).toBe(deriveAddress(new Mnemonic(BIP39_12)))
    expect(deriveAddress(new Mnemonic(BIP39_12, ''))).toBe(BIP39_12_ADDRESS)
  })
  test('passphrase changes the address, same path', () => {
    const a = deriveAddress(new Mnemonic(BIP39_12, TREZOR_PASSPHRASE))
    expect(a).not.toBe(BIP39_12_ADDRESS)
    expect(a.toLowerCase()).toBe(BIP39_12_TREZOR_ADDRESS)
    expect(deriveAddress(toMnemonic(BIP39_12, TREZOR_PASSPHRASE)!)).toBe(a)
  })
  test('passphrase is case sensitive', () => {
    expect(deriveAddress(new Mnemonic(BIP39_12, 'trezor'))).not.toBe(deriveAddress(new Mnemonic(BIP39_12, 'TREZOR')))
  })
  test('passphrase is masked and reveal() returns words only', () => {
    const m = new Mnemonic(BIP39_12, TREZOR_PASSPHRASE)
    expect(m.reveal()).toBe(BIP39_12)
    expect(m.passphrase()).toBe(TREZOR_PASSPHRASE)
    expect([String(m), JSON.stringify(m), inspect(m), Object.getOwnPropertyNames(m).join()].join(' ')).not.toContain(
      TREZOR_PASSPHRASE,
    )
  })
})

describe('Mnemonic constructor', () => {
  test('rejects invalid phrases', () => {
    expect(() => new Mnemonic('not a valid phrase')).toThrow(TypeError)
  })
})
