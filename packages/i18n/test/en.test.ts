import { afterEach, describe, expect, it } from 'vitest'
import { i18n, pickLanguage } from '../src'
import { ko } from '../src/ko'
import { en } from '../src/en'

const leaves = (o: object, prefix = ''): [string, string][] =>
  Object.entries(o).flatMap(([k, v]: [string, unknown]) =>
    typeof v === 'object' && v !== null ? leaves(v, `${prefix}${k}.`) : [[`${prefix}${k}`, String(v)]],
  )
const vars = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort()

describe('app en copy (ADR-0037)', () => {
  afterEach(() => void i18n.changeLanguage('ko'))

  it('has exactly the keys of ko', () => {
    expect(
      leaves(en)
        .map(([k]) => k)
        .sort(),
    ).toEqual(
      leaves(ko)
        .map(([k]) => k)
        .sort(),
    )
  })

  it('uses no variable that ko does not pass, and no empty or Korean string', () => {
    const koByKey = new Map(leaves(ko))
    for (const [k, v] of leaves(en)) {
      expect(v, k).not.toBe('')
      expect(v, k).not.toMatch(/[가-힣]/)
      // en may drop a ko-only variable (copula), never add one.
      for (const name of vars(v)) expect(vars(koByKey.get(k) ?? ''), k).toContain(name)
    }
  })

  it('resolves en after a language change and keeps the date lists at their length', () => {
    void i18n.changeLanguage('en')
    expect(i18n.t('start.create')).toBe('Create a new wallet')
    for (const set of [en, ko]) {
      expect(set.time.months.split(',')).toHaveLength(12)
      expect(set.time.weekdays.split(',')).toHaveLength(7)
    }
  })
})

describe('pickLanguage', () => {
  it('takes the first supported device language', () => {
    expect(pickLanguage(['en', 'ko'])).toBe('en')
    expect(pickLanguage(['fr', 'KO', 'en'])).toBe('ko')
    expect(pickLanguage(['ja', null, 'en'])).toBe('en')
  })

  it('falls back to ko', () => {
    expect(pickLanguage([])).toBe('ko')
    expect(pickLanguage(['fr', null])).toBe('ko')
  })
})
