import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// An address is ASCII. On Android with a Korean locale the default keyboard types Hangul jamo; `visible-password` gives the Latin one (as in WordCell).
describe('RecipientField keyboard', () => {
  it('asks Android for the Latin keyboard and iOS for ASCII', () => {
    const src = readFileSync(new URL('../src/shared/ui/RecipientField.tsx', import.meta.url), 'utf8')
    expect(src).toContain("keyboardType={Platform.OS === 'android' ? 'visible-password' : 'ascii-capable'}")
  })
})
