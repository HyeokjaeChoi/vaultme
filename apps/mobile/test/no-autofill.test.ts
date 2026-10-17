import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { NO_AUTOFILL } from '../src/shared/ui/noAutofill'

const src = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8')

describe('recovery-phrase fields never reach a password manager', () => {
  it('NO_AUTOFILL sets every documented off switch', () => {
    expect(NO_AUTOFILL).toMatchObject({ autoComplete: 'off', textContentType: 'none', importantForAutofill: 'no', autoCorrect: false, spellCheck: false, autoCapitalize: 'none' })
  })
  it.each(['shared/ui/WordCell.tsx', 'pages/restore/index.tsx', 'pages/backup/check.tsx'])('%s spreads NO_AUTOFILL on its inputs', (file) => {
    expect(src(file)).toContain('{...NO_AUTOFILL}')
  })
  it('the passphrase field is the secure one and carries it too', () => {
    const s = src('pages/restore/index.tsx')
    const field = s.slice(s.indexOf('secureTextEntry'), s.indexOf('secureTextEntry') + 600)
    expect(field).toContain('{...NO_AUTOFILL}')
  })
})
