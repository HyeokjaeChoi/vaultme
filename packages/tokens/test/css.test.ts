import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { dark, light } from '../src/generated/tokens'

// Behaviour of the CSS outputs (tokens.css, theme.css) as a web app consumes them: parse the files, never the build script.
const read = (f: string) => readFileSync(resolve(__dirname, '../src/generated', f), 'utf8')
const tokensCss = read('tokens.css')
const themeCss = read('theme.css')

const decls = (css: string) =>
  [...css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, n, v]) => [n!, v!.trim()] as const)
// Content of the block that follows `header`, e.g. `:root {`. Blocks hold declarations only, so the first `}` closes them.
const block = (css: string, header: string) => {
  const start = css.indexOf(header)
  if (start < 0) throw new Error(`missing block ${header}`)
  const open = start + header.length
  return css.slice(open, css.indexOf('}', open))
}

const light$ = new Map(decls(block(tokensCss, ':root {')))
const darkMedia = block(tokensCss, ':root:not([data-theme="light"]) {')
const darkAttr = block(tokensCss, ':root[data-theme="dark"] {')
const dark$ = new Map([...light$, ...decls(darkAttr)])

const refs = (v: string) => [...v.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]!)
const resolveVar = (vars: Map<string, string>, name: string): string => {
  const v = vars.get(name)
  if (v === undefined) throw new Error(`undefined ${name}`)
  const m = /^var\((--[\w-]+)\)$/.exec(v)
  return m ? resolveVar(vars, m[1]!) : v
}

describe('tokens.css', () => {
  it('declares color-scheme for each theme so browser controls follow', () => {
    expect(block(tokensCss, ':root {')).toContain('color-scheme: light;')
    expect(darkMedia).toContain('color-scheme: dark;')
    expect(darkAttr).toContain('color-scheme: dark;')
  })

  it('has Primitive, Semantic and Component variables', () => {
    for (const layer of ['primitive', 'semantic', 'component'])
      expect([...light$.keys()].some((n) => n.startsWith(`--${layer}-`))).toBe(true)
  })

  it('keeps raw values in Primitive only: Semantic and Component are var() aliases', () => {
    const raw = [...light$, ...decls(darkAttr)].filter(
      ([n, v]) => !n.startsWith('--primitive-') && !/^var\(--[\w-]+\)$/.test(v),
    )
    expect(raw).toEqual([])
  })

  it('resolves every var() in light and dark to a defined variable', () => {
    for (const vars of [light$, dark$])
      for (const [n, v] of vars) for (const r of refs(v)) expect(vars.has(r), `${n} -> ${r}`).toBe(true)
  })

  it('has no alias cycles and no empty values', () => {
    for (const vars of [light$, dark$]) for (const n of vars.keys()) expect(resolveVar(vars, n)).not.toBe('')
  })

  it('dark overrides only Semantic, once for system dark and once for [data-theme="dark"]', () => {
    expect(decls(darkMedia)).toEqual(decls(darkAttr))
    const names = decls(darkAttr).map(([n]) => n)
    expect(names.length).toBeGreaterThan(0)
    expect(names.every((n) => n.startsWith('--semantic-'))).toBe(true)
    expect(tokensCss.indexOf('prefers-color-scheme: dark')).toBeLessThan(tokensCss.indexOf(darkMedia))
  })

  it('agrees with the mobile TS output for every color and px value, in both themes', () => {
    const kebab = (s: string) =>
      s
        .replace(/_/g, '-')
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .toLowerCase()
    const flat = (o: unknown, path: string[] = []): [string, string | number][] =>
      typeof o === 'object' && o !== null
        ? Object.entries(o).flatMap(([k, v]) => flat(v, [...path, k]))
        : [[`--${path.map(kebab).join('-')}`, o as string | number]]
    let compared = 0
    for (const [theme, vars] of [
      [light, light$],
      [dark, dark$],
    ] as const)
      for (const [name, ts] of flat(theme)) {
        if (!vars.has(name)) continue
        const css = resolveVar(vars, name)
        if (typeof ts === 'string' && /^(#|rgba?\()/.test(ts)) expect(css, name).toBe(ts)
        else if (typeof ts === 'number' && /^-?[\d.]+px$/.test(css)) expect(Number.parseFloat(css), name).toBe(ts)
        else continue
        compared++
      }
    expect(compared).toBeGreaterThan(500)
  })

  it('emits typography as parts that Tailwind can map', () => {
    expect(resolveVar(light$, '--semantic-typography-row-font-size')).toMatch(/^\d+px$/)
    expect(resolveVar(light$, '--semantic-typography-row-letter-spacing')).toMatch(/em$/)
    expect(resolveVar(light$, '--component-button-size-md-label-font-weight')).toMatch(/^[1-9]00$/)
  })
})

describe('theme.css (Tailwind v4)', () => {
  const theme = block(themeCss, '@theme inline {')
  const themeDecls = decls(theme)

  it('clears the whole default theme before it maps tokens', () => {
    expect(theme.trim().startsWith('--*: initial;')).toBe(true)
    // No base `--spacing` multiplier either: p-4 stays undefined, only token names exist.
    expect(themeDecls.map(([n]) => n)).not.toContain('--spacing')
  })

  it('maps only tokens: var() references that exist in tokens.css, or a breakpoint/container literal that equals its token', () => {
    expect(themeDecls.length).toBeGreaterThan(200)
    for (const [n, v] of themeDecls) {
      if (/^--(breakpoint|container)-/.test(n)) {
        // Media and container queries cannot read var(), so these hold the resolved px value.
        expect(v, n).toMatch(/^\d+px$/)
        expect([...light$.values()].filter((x) => x === v).length, n).toBeGreaterThan(0)
      } else {
        expect(v, n).toMatch(/^var\(--(primitive|semantic|component)-[\w-]+\)$/)
        expect(light$.has(refs(v)[0]!), `${n} -> ${v}`).toBe(true)
      }
    }
  })

  it('has no default palette or spacing multiplier; same-named scales (radius-md) point at tokens', () => {
    const names = themeDecls.map(([n]) => n)
    for (const dflt of ['--color-red-500', '--color-white', '--color-black', '--spacing'])
      expect(names).not.toContain(dflt)
    expect(themeDecls.find(([n]) => n === '--radius-md')?.[1]).toBe('var(--primitive-radius-md)')
    expect(new Set(names).size).toBe(names.length)
  })

  it('never exposes the raw primitive palette, so colors follow light/dark', () => {
    expect(themeDecls.filter(([n]) => n.startsWith('--color-')).length).toBeGreaterThan(50)
    expect(themeDecls.filter(([n, v]) => n.startsWith('--color-') && v.includes('--primitive-'))).toEqual([])
  })

  it('maps the scales a web app needs', () => {
    const names = new Set(themeDecls.map(([n]) => n))
    for (const n of [
      '--color-surface-canvas',
      '--spacing-4',
      '--radius-md',
      '--text-row',
      '--text-row--line-height',
      '--text-row--letter-spacing',
      '--text-row--font-weight',
      '--font-mono',
      '--font-weight-medium',
      '--shadow-md',
      '--breakpoint-tablet',
      '--container-layout-content-max-width',
      '--breakpoint-web-desktop',
      '--spacing-web-header-height',
      '--spacing-layout-web-narrow-width',
    ])
      expect(names.has(n), n).toBe(true)
  })

  it('maps the web breakpoint to 1280 and the web sizes to the Figma values', () => {
    const get = (n: string) => themeDecls.find(([k]) => k === n)?.[1]
    expect(get('--breakpoint-web-desktop')).toBe('1280px')
    expect(resolveVar(light$, '--component-web-header-height')).toBe('68px')
    expect(resolveVar(light$, '--semantic-layout-web-narrow-width')).toBe('560px')
  })
})
