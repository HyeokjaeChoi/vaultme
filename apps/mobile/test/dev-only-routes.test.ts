import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const app = new URL('../app/', import.meta.url).pathname

// These routes are design captures with no real data: a release build must redirect to `/` (`vaultme://<route>` is a public deep link).
describe('dev-only routes', () => {
  it.each(['kit', 'lock-demo', 'update-demo'])('%s renders only when __DEV__ and redirects otherwise', (name) => {
    const src = readFileSync(`${app}${name}.tsx`, 'utf8')
    expect(src).toMatch(/__DEV__\s*\?/)
    expect(src).toContain('<Redirect href="/" />')
  })
})
