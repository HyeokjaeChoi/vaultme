import { isMnemonicWord, validateMnemonic } from '@vaultme/wallet-core'
import { at } from '@/shared/lib/at'

// S05 input checks. Pure: no storage, no logging. The text is the user's typed phrase and must never leave the component.

/** Lower-case words split on any whitespace (paste may bring newlines or no-break spaces). */
export const toWords = (text: string): string[] => text.trim().toLowerCase().split(/\s+/).filter(Boolean)

const isPhraseLength = (count: number): boolean => count === 12 || count === 24

export type PhraseIssue =
  | { kind: 'unknownWord'; word: string } // first word outside the BIP39 list (the user's own typed token)
  | { kind: 'wrongCount'; count: number }
  | { kind: 'badChecksum' }

export type PhraseState = { count: number; ready: boolean; issue: PhraseIssue | null }

/**
 * `final` = the user pressed 복구 or left the field. While typing (`final` false) the word still being typed is not
 * judged, and a count that may still grow (13 to 23) is not an error. `ready` = 12 or 24 words, no unknown word.
 */
export function inspectPhrase(text: string, final = false): PhraseState {
  const words = toWords(text)
  const count = words.length
  const typing = !final && !/\s$/.test(text)
  const judged = typing ? words.slice(0, -1) : words
  const bad = judged.find((w) => !isMnemonicWord(w))
  if (bad !== undefined) return { count, ready: false, issue: { kind: 'unknownWord', word: bad } }
  if (!isPhraseLength(count)) {
    const tooMany = count > 24
    return { count, ready: false, issue: (final && count > 0) || tooMany ? { kind: 'wrongCount', count } : null }
  }
  if (typing && !isMnemonicWord(at(words, count - 1))) return { count, ready: false, issue: null }
  const check = validateMnemonic(words.join(' '))
  return { count, ready: true, issue: check.kind === 'badChecksum' && final ? { kind: 'badChecksum' } : null }
}
