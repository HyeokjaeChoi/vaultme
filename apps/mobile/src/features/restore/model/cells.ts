import { toWords } from './phrase'

// S05 per-word cells (Figma B/Word cell 565:73619). Pure helpers: the words only live in the page state, never stored or logged.

export type WordCount = 12 | 24
const MAX_WORDS = 24

export const emptyWords = (): string[] => Array<string>(MAX_WORDS).fill('')

export type CellInput = { words: string[]; count: WordCount; focus: number | null }

/**
 * One cell changed to `value`. Several words (a paste, any cell) replace all cells from cell 1; more than 12 words
 * switch to 24. One word + a space/newline = commit it and move to the next cell. One word = just that cell.
 * `focus` = the cell to focus next (null = stay, or close the keyboard past the last cell).
 */
export function applyCellInput(words: string[], count: WordCount, index: number, value: string): CellInput {
  const list = toWords(value)
  if (list.length > 1) {
    const next = list.length > 12 ? 24 : list.length === 12 ? 12 : count
    const filled = emptyWords().map((_, i) => list[i] ?? '')
    return { words: filled, count: next, focus: Math.min(list.length, next) - 1 }
  }
  const word = list[0] ?? ''
  const commit = word !== '' && /\s$/.test(value)
  const out = words.map((w, i) => (i === index ? word : w))
  return { words: out, count, focus: commit ? (index + 1 < count ? index + 1 : null) : index }
}

/** Switching 12 <-> 24 keeps every word (12 only hides 13-24). */
export const visibleWords = (words: string[], count: WordCount): string[] => words.slice(0, count)

/** Phrase text for restoreWallet. */
export const joinWords = (words: string[], count: WordCount): string => visibleWords(words, count).join(' ')

/** Words of a phrase restored earlier, to refill the cells. */
export function fromPhrase(text: string): { words: string[]; count: WordCount } {
  const list = toWords(text).slice(0, MAX_WORDS)
  return { words: emptyWords().map((_, i) => list[i] ?? ''), count: list.length > 12 ? 24 : 12 }
}

/** Opening keeps the field empty or as is; collapsing clears it (a value the user cannot see must not be used for the restore). */
export const togglePassphrase = (open: boolean, passphrase: string): { open: boolean; passphrase: string } =>
  open ? { open: false, passphrase: '' } : { open: true, passphrase }
