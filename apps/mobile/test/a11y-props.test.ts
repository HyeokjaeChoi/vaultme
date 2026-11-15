import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// MOB-6 (docs/plans/quality-gates.md): every touchable has a role (or is hidden from screen readers),
// every TextInput has a label. Source scan, no dependency; 0 missing allowed.
const root = new URL('../src/', import.meta.url).pathname
const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith('.tsx') ? [join(dir, e.name)] : [],
  )

/** Opening tags `<Name ...>` with the attribute text: `>` inside `{}` or quotes does not end the tag. */
function openingTags(src: string, names: RegExp): { name: string; attrs: string; line: number }[] {
  const out: { name: string; attrs: string; line: number }[] = []
  const start = new RegExp(`<(${names.source})(?=[\\s/>])`, 'g')
  for (let m = start.exec(src); m; m = start.exec(src)) {
    let depth = 0
    let quote = ''
    let i = start.lastIndex
    for (; i < src.length; i++) {
      const c = src[i]!
      if (quote) quote = c === quote ? '' : quote
      else if (c === '"' || c === "'") quote = c
      else if (c === '{') depth++
      else if (c === '}') depth--
      else if (c === '>' && depth === 0) break
    }
    out.push({ name: m[1]!, attrs: src.slice(start.lastIndex, i), line: src.slice(0, m.index).split('\n').length })
  }
  return out
}

const touchable = /Pressable|Touchable(?:Opacity|Highlight|WithoutFeedback|NativeFeedback)/
const count = (names: RegExp) => files(root).reduce((n, f) => n + openingTags(readFileSync(f, 'utf8'), names).length, 0)
const scan = (names: RegExp, ok: (attrs: string) => boolean) =>
  files(root).flatMap((f) =>
    openingTags(readFileSync(f, 'utf8'), names)
      .filter((t) => !ok(t.attrs))
      .map((t) => `${f.slice(root.length)}:${String(t.line)} <${t.name}>`),
  )

describe('screen-reader props (MOB-6)', () => {
  it('the scan sees the controls of src/ (a wrong path or filter would pass for free)', () => {
    expect(count(touchable)).toBeGreaterThan(30)
    expect(count(/TextInput/)).toBeGreaterThanOrEqual(3)
  })

  it('every Pressable/Touchable has accessibilityRole or accessible={false}', () => {
    expect(scan(touchable, (a) => /\baccessibilityRole=|\brole=|\baccessible=\{false\}/.test(a))).toEqual([])
  })

  it('every TextInput has an accessibilityLabel (or labelledBy)', () => {
    expect(scan(/TextInput/, (a) => /\baccessibilityLabel=|\baria-label=|\baccessibilityLabelledBy=/.test(a))).toEqual(
      [],
    )
  })

  it('the scan finds tags and sees a missing prop (guards the scanner itself)', () => {
    const src = `<Pressable onPress={() => a > b} accessibilityRole="button">\n<Pressable onPress={f}>`
    const tags = openingTags(src, touchable)
    expect(tags.map((t) => t.line)).toEqual([1, 2])
    expect(/\baccessibilityRole=/.test(tags[0]!.attrs)).toBe(true)
    expect(/\baccessibilityRole=/.test(tags[1]!.attrs)).toBe(false)
  })
})
