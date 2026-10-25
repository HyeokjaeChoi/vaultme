import { describe, expect, it } from 'vitest'
import { webEn, webKo, webLocales, webMessages } from '../src/web'

const paths = (o: object, prefix = ''): string[] =>
  Object.entries(o).flatMap(([k, v]: [string, unknown]) =>
    typeof v === 'object' && v !== null ? paths(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  )

describe('web messages', () => {
  it('en has exactly the keys of ko', () => {
    expect(paths(webEn).sort()).toEqual(paths(webKo).sort())
  })

  it('has no empty string in any locale', () => {
    for (const locale of webLocales) {
      const values = JSON.stringify(webMessages[locale])
      expect(values).not.toContain('""')
    }
  })

  it('en differs from ko on user-facing copy', () => {
    expect(webEn.notFound.title).not.toBe(webKo.notFound.title)
  })
})
