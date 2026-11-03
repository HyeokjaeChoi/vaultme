import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

// A look-alike sender (address poisoning) must show the full address with no copy button, so the middle can be compared.
it('S41 caution row shows the full address and offers no copy', () => {
  const src = readFileSync(new URL('../src/pages/activity/detail.tsx', import.meta.url), 'utf8')
  const start = src.indexOf('// A look-alike sender')
  const branch = src.slice(start, src.indexOf(') : (', start))
  expect(branch).toContain('<AddressText address={row.counterparty} />')
  expect(branch).toContain('<NewSenderLine row={row} />')
  expect(branch).not.toContain('copy=')
  expect(branch).not.toContain('shortAddress')
})
