import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
// @ts-expect-error plain .mjs module without types
import { designPath, frontMatter, tokensPath, withFrontMatter } from '../design-md.mjs'

describe('DESIGN.md', () => {
  it('front matter matches tokens.json (run `node packages/tokens/design-md.mjs --write`)', () => {
    const doc = readFileSync(designPath, 'utf8')
    const fm = frontMatter(JSON.parse(readFileSync(tokensPath, 'utf8')))
    expect(doc.startsWith(fm)).toBe(true)
  })

  it('replaces only the leading front matter block', () => {
    expect(withFrontMatter('---\nold: 1\n---\n# Body\n---\nx\n---\n', '---\nnew: 2\n---\n')).toBe(
      '---\nnew: 2\n---\n# Body\n---\nx\n---\n',
    )
  })
})
