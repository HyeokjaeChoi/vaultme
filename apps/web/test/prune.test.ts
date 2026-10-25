import { describe, expect, it } from 'vitest'
import { pruneCustomProperties } from '../build-tools/prune-custom-properties'

describe('pruneCustomProperties', () => {
  it('keeps used properties and what they read, drops the rest', () => {
    const out = pruneCustomProperties(`
      :root{--a:1px;--b:var(--a);--unused:2px;--chain-x:var(--chain-y);--chain-y:3px}
      .x{padding:var(--b);color:var(--missing,red)}
      .y{margin:var(--chain-x)}`)
    expect(out).toContain('--a:1px')
    expect(out).toContain('--b:var(--a)')
    expect(out).toContain('--chain-y:3px')
    expect(out).not.toContain('--unused')
  })

  it('prunes inside media queries and removes rules left empty', () => {
    const out = pruneCustomProperties(`
      @media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--dead:1}}
      :root{--live:1}
      .x{top:var(--live)}`)
    expect(out).not.toContain('@media')
    expect(out).not.toContain('--dead')
    expect(out).toContain('--live:1')
  })

  it('always keeps Tailwind --tw-* properties', () => {
    expect(pruneCustomProperties('.a{--tw-x:1}')).toContain('--tw-x:1')
  })
})
