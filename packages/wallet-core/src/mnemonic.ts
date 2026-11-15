import { generateMnemonic as bip39Generate, mnemonicToSeedSync, validateMnemonic as bip39Validate } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import type { Address } from 'viem'
import { toHex } from 'viem'
import { HDKey, privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts'
import { DERIVATION_PATH } from './constants'

const HARDENED = 0x80000000
const MASK = '[Mnemonic: hidden]'

/**
 * Holds the phrase (and the optional BIP39 passphrase, "" = none) in true private fields. Nothing printable or
 * serializable reveals them. `reveal()` returns the words only (backup screen). `passphrase()` is for storage only.
 * Signing and address derivation go through `account()`.
 */
export class Mnemonic {
  readonly #words: string
  readonly #passphrase: string
  constructor(words: string, passphrase = '') {
    if (validateMnemonic(words).kind !== 'ok') throw new TypeError('Invalid mnemonic')
    this.#words = normalize(words).join(' ')
    this.#passphrase = passphrase
  }
  reveal(): string {
    return this.#words
  }
  /** Storage only. Never show it, never log it. */
  passphrase(): string {
    return this.#passphrase
  }
  /**
   * Account at m/44'/60'/0'/0/0 for these words and this passphrase. The seed and every HD key on the path (master,
   * m/44', ..., child) are wiped before this returns, also when a step throws (SEC-9). Not wiped, and not claimed: the
   * account holds the key as a hex string, and @scure/bip32 keeps other copies inside (the HMAC output, the bigint, the
   * hardened-derive input), which JS cannot reach.
   */
  account(): PrivateKeyAccount {
    const seed = mnemonicToSeedSync(this.#words, this.#passphrase)
    const keys: HDKey[] = []
    try {
      let key = HDKey.fromMasterSeed(seed)
      keys.push(key)
      for (const step of DERIVATION_PATH.split('/').slice(1)) {
        key = key.deriveChild(parseInt(step, 10) + (step.endsWith("'") ? HARDENED : 0))
        keys.push(key)
      }
      const bytes = key.privateKey
      if (!bytes) throw new Error('No private key') // never for a child of a seed
      return privateKeyToAccount(toHex(bytes))
    } finally {
      seed.fill(0)
      for (const k of keys) k.wipePrivateData()
    }
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

/** True when `word` (already lower-case) is in the BIP39 English wordlist. For live checks while the user types. */
const wordSet = new Set<string>(wordlist) // O(1) per check; `includes` scanned 2048 words per cell per render
export const isMnemonicWord = (word: string): boolean => wordSet.has(word)

export function validateMnemonic(words: string): MnemonicCheck {
  const list = normalize(words)
  if (list.length !== 12 && list.length !== 24) return { kind: 'wrongLength', count: list.length }
  const index = list.findIndex((w) => !wordSet.has(w))
  if (index >= 0) return { kind: 'unknownWord', index }
  return bip39Validate(list.join(' '), wordlist) ? { kind: 'ok' } : { kind: 'badChecksum' }
}

/** Restore path: returns a Mnemonic only for a valid phrase. */
export function toMnemonic(words: string, passphrase = ''): Mnemonic | null {
  return validateMnemonic(words).kind === 'ok' ? new Mnemonic(normalize(words).join(' '), passphrase) : null
}

export function deriveAddress(m: Mnemonic): Address {
  return m.account().address
}
