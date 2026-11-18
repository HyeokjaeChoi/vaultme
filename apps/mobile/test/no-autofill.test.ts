import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { NO_AUTOFILL, PASSPHRASE_FIELD } from '../src/shared/ui/noAutofill'

const src = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8')

describe('recovery-phrase fields never reach a password manager', () => {
  it('NO_AUTOFILL sets every documented off switch', () => {
    expect(NO_AUTOFILL).toMatchObject({
      autoComplete: 'off',
      textContentType: 'none',
      importantForAutofill: 'no',
      autoCorrect: false,
      spellCheck: false,
      autoCapitalize: 'none',
    })
  })
  it.each(['shared/ui/WordCell.tsx', 'pages/backup/check.tsx'])('%s spreads NO_AUTOFILL on its inputs', (file) => {
    expect(src(file)).toContain('{...NO_AUTOFILL}')
  })
  it('the passphrase field is the secure one and carries it too', () => {
    const s = src('pages/restore/index.tsx')
    const field = s.slice(s.indexOf('secureTextEntry'), s.indexOf('secureTextEntry') + 600)
    expect(field).toContain('{...PASSPHRASE_FIELD}')
  })
  // #683: with textContentType 'none' iOS still offered "Save Password?" after a masked passphrase was typed.
  it('PASSPHRASE_FIELD keeps every off switch but marks the field a one-time code, not a credential', () => {
    expect(PASSPHRASE_FIELD).toMatchObject({ ...NO_AUTOFILL, textContentType: 'oneTimeCode' })
    expect(PASSPHRASE_FIELD.textContentType).not.toBe('password')
    expect(PASSPHRASE_FIELD.textContentType).not.toBe('newPassword')
  })
})
