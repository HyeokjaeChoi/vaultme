import { generateMnemonic as bip39Generate, validateMnemonic as bip39Validate } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import type { Address } from 'viem'
import { mnemonicToAccount } from 'viem/accounts'
import { DERIVATION_PATH } from './constants'

const MASK = '[Mnemonic: hidden]'

/**
 * Holds the phrase in a true private field. Nothing printable or serializable
 * reveals it. Only `reveal()` returns the words (backup screen, signing).
 */
export class Mnemonic {
  readonly #words: string
  constructor(words: string) {
    if (validateMnemonic(words).kind !== 'ok') throw new TypeError('Invalid mnemonic')
    this.#words = normalize(words).join(' ')
  }
  reveal(): string {
    return this.#words
  }
  toString(): string {
    return MASK
  }
  toJSON(): string {
    return MASK
  }
  [Symbol.toPrimitive](): string {
    return MASK
  }
  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return MASK
  }
}

export type MnemonicCheck =
  | { kind: 'ok' }
  | { kind: 'wrongLength'; count: number }
  | { kind: 'unknownWord'; index: number }
  | { kind: 'badChecksum' }

const normalize = (words: string) => words.trim().toLowerCase().split(/\s+/).filter(Boolean)

export function generateMnemonic(): Mnemonic {
  return new Mnemonic(bip39Generate(wordlist, 128))
}

export function validateMnemonic(words: string): MnemonicCheck {
  const list = normalize(words)
  if (list.length !== 12 && list.length !== 24) return { kind: 'wrongLength', count: list.length }
  const index = list.findIndex((w) => !wordlist.includes(w))
  if (index >= 0) return { kind: 'unknownWord', index }
  return bip39Validate(list.join(' '), wordlist) ? { kind: 'ok' } : { kind: 'badChecksum' }
}

/** Restore path: returns a Mnemonic only for a valid phrase. */
export function toMnemonic(words: string): Mnemonic | null {
  return validateMnemonic(words).kind === 'ok' ? new Mnemonic(normalize(words).join(' ')) : null
}

export function deriveAddress(m: Mnemonic): Address {
  return mnemonicToAccount(m.reveal(), { path: DERIVATION_PATH }).address
}
