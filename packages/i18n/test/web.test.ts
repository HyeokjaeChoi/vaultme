import { describe, expect, it } from 'vitest'
import { webEn, webKo, webLocales, webMessages } from '../src/web'
import { webLanding } from '../src/webLanding'
import { webTx } from '../src/webTx'

const paths = (o: object, prefix = ''): string[] =>
  Object.entries(o).flatMap(([k, v]: [string, unknown]) =>
    typeof v === 'object' && v !== null ? paths(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  )

// The web copy is three entry points (the viewer pages do not ship the landing and transaction strings).
const sets = { web: webMessages, landing: webLanding, tx: webTx }

describe('web messages', () => {
  it('en has exactly the keys of ko', () => {
    expect(paths(webEn).sort()).toEqual(paths(webKo).sort())
    expect(paths(webLanding.en).sort()).toEqual(paths(webLanding.ko).sort())
    expect(paths(webTx.en).sort()).toEqual(paths(webTx.ko).sort())
  })

  it('has no empty string in any locale', () => {
    for (const locale of webLocales)
      for (const set of Object.values(sets)) expect(JSON.stringify(set[locale])).not.toContain('""')
  })

  it('en differs from ko on user-facing copy', () => {
    expect(webLanding.en.notFound.title).not.toBe(webLanding.ko.notFound.title)
    expect(webTx.en.title).not.toBe(webTx.ko.title)
  })
})
