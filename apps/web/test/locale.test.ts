import { describe, expect, it } from 'vitest'
import { homeOf, localeOf, otherLocale } from '../app/shared/lib/locale'

describe('locale', () => {
  it.each([
    ['/', 'ko'],
    ['/404', 'ko'],
    ['/address', 'ko'],
    ['/en', 'en'],
    ['/en/', 'en'],
    ['/en/anything/deep', 'en'],
    ['/english', 'ko'],
  ] as const)('localeOf(%s) = %s', (path, expected) => {
    expect(localeOf(path)).toBe(expected)
  })

  it('links home and to the other language without redirect logic', () => {
    expect(homeOf('ko')).toBe('/')
    expect(homeOf('en')).toBe('/en/')
    expect(otherLocale('ko')).toBe('en')
    expect(otherLocale('en')).toBe('ko')
  })
})
