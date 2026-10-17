import type { WordCount } from './cells'

// S05 -> S06 -> S05 hand-off for "다른 주소예요": the words stay in memory only (never stored). The passphrase is never kept,
// only the fact that one was used (S06 line "패스프레이즈로 복구했어요."). Cleared when the wallet is opened, when the app
// goes to the background, and once S05 has taken the words back.
let held: { words: string[]; count: WordCount } | null = null
let usedPassphrase = false

export function holdRestore(words: string[], count: WordCount, withPassphrase: boolean): void {
  held = { words: [...words], count }
  usedPassphrase = withPassphrase
}
export function takeWords(): { words: string[]; count: WordCount } | null {
  const h = held
  held = null
  usedPassphrase = false
  return h
}
export const restoredWithPassphrase = (): boolean => usedPassphrase
export function clearHeld(): void {
  held = null
  usedPassphrase = false
}
