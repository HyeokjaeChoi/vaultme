import { at } from '@/shared/lib/at'

// S04 word check: pure logic + a tiny in-memory hand-off from S03 to S04.
// The hand-off holds only the 3 asked words (never the 12), and is cleared on leaving S04.

export const PHRASE_LENGTH = 12
export const CHECK_COUNT = 3

/** `count` distinct 1-based positions in 1..`length`, ascending. `rand` is injectable for tests. */
export function pickPositions(rand: () => number = Math.random, length = PHRASE_LENGTH, count = CHECK_COUNT): number[] {
  const pool = Array.from({ length }, (_, i) => i + 1)
  const out: number[] = []
  while (out.length < count)
    out.push(at(pool.splice(Math.min(pool.length - 1, Math.floor(rand() * pool.length)), 1), 0))
  out.sort((a, b) => a - b)
  return out
}

const norm = (w: string) => w.trim().toLowerCase()

/** True when every answer matches its expected word (trim + case-insensitive). */
export const checkAnswers = (expected: readonly string[], answers: readonly string[]): boolean =>
  expected.length > 0 &&
  expected.length === answers.length &&
  expected.every((w, i) => norm(w) === norm(answers[i] ?? ''))

/** Indexes of the answers that differ from the expected word (same rule as checkAnswers). An empty answer counts as wrong. */
export const wrongIndexes = (expected: readonly string[], answers: readonly string[]): number[] =>
  expected.flatMap((w, i) => (norm(w) === norm(answers[i] ?? '') ? [] : [i]))

export type CheckSession = { positions: number[]; words: string[] }
let session: CheckSession | null = null

/** S03 -> S04: remember which positions to ask and their words. Replaces any earlier session. */
export function startCheck(phrase: readonly string[], rand?: () => number): number[] {
  const positions = pickPositions(rand, phrase.length)
  session = { positions, words: positions.map((p) => at(phrase, p - 1)) }
  return positions
}
export const getCheck = (): CheckSession | null => session
export const clearCheck = (): void => {
  session = null
}
