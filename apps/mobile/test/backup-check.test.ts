import { describe, expect, it } from 'vitest'
import { checkAnswers, clearCheck, getCheck, pickPositions, startCheck, wrongIndexes } from '../src/features/backup/model/check'

// Placeholder words only. Never a generated or real phrase.
const PHRASE = Array.from({ length: 12 }, (_, i) => `word${i + 1}`)

describe('pickPositions', () => {
  it('returns 3 distinct ascending positions within 1..12, for any rand', () => {
    for (let i = 0; i < 500; i++) {
      const p = pickPositions()
      expect(p).toHaveLength(3)
      expect(new Set(p).size).toBe(3)
      expect(p.every((n) => Number.isInteger(n) && n >= 1 && n <= 12)).toBe(true)
      expect([...p].sort((a, b) => a - b)).toEqual(p)
    }
  })
  it('handles the rand extremes (0 and just below 1)', () => {
    expect(pickPositions(() => 0)).toEqual([1, 2, 3])
    expect(pickPositions(() => 0.999999)).toEqual([10, 11, 12])
  })
})

describe('checkAnswers', () => {
  it('accepts matching words, ignoring case and spaces', () => {
    expect(checkAnswers(['a', 'b', 'c'], ['a', ' B ', 'C'])).toBe(true)
  })
  it('rejects a wrong, missing or empty answer', () => {
    expect(checkAnswers(['a', 'b', 'c'], ['a', 'b', 'x'])).toBe(false)
    expect(checkAnswers(['a', 'b', 'c'], ['a', 'b'])).toBe(false)
    expect(checkAnswers(['a', 'b', 'c'], ['', '', ''])).toBe(false)
    expect(checkAnswers([], [])).toBe(false)
  })
})

describe('check session', () => {
  it('holds only the asked words, and clearCheck drops them', () => {
    const positions = startCheck(PHRASE, () => 0)
    expect(positions).toEqual([1, 2, 3])
    const s = getCheck()!
    expect(s.words).toEqual(['word1', 'word2', 'word3'])
    expect(JSON.stringify(s)).not.toContain('word12')
    clearCheck()
    expect(getCheck()).toBeNull()
  })
  it('a new session replaces the old one', () => {
    startCheck(PHRASE, () => 0)
    startCheck(PHRASE, () => 0.999999)
    expect(getCheck()!.positions).toEqual([10, 11, 12])
    clearCheck()
  })
})

describe('wrongIndexes', () => {
  it('lists only the wrong or empty cells, so the right ones stay unmarked', () => {
    expect(wrongIndexes(['a', 'b', 'c'], ['a', 'x', 'C'])).toEqual([1])
    expect(wrongIndexes(['a', 'b', 'c'], ['', 'b', 'x'])).toEqual([0, 2])
    expect(wrongIndexes(['a', 'b', 'c'], ['a', 'b', 'c'])).toEqual([])
  })
})
