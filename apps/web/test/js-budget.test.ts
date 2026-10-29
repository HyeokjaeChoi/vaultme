import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import {
  gzipSize,
  limitFor,
  measure,
  report,
  scriptPaths,
  STATIC_LIMIT,
  VIEWER_LIMIT,
  type Lhr,
} from '../scripts/js-budget.ts'

const ORIGIN = 'http://localhost:8799'

function lhr(page: string, items: { url: string; resourceType?: string; statusCode?: number }[]): Lhr {
  return {
    requestedUrl: `${ORIGIN}${page}`,
    finalDisplayedUrl: `${ORIGIN}${page}`,
    audits: { 'network-requests': { details: { items } } },
  }
}
const script = (url: string, statusCode = 200) => ({ url, resourceType: 'Script', statusCode })

function build(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'js-budget-'))
  for (const [name, body] of Object.entries(files)) {
    mkdirSync(join(dir, name, '..'), { recursive: true })
    writeFileSync(join(dir, name), body)
  }
  return dir
}
const gz = (s: string) => gzipSync(s, { level: 9 }).length

describe('limitFor', () => {
  it('gives the viewer routes the larger limit', () => {
    for (const p of ['/address', '/en/address', '/tx', '/en/tx']) expect(limitFor(`${ORIGIN}${p}`)).toBe(VIEWER_LIMIT)
    for (const p of ['/', '/en/', '/no-such-page', '/en/no-such-page'])
      expect(limitFor(`${ORIGIN}${p}`)).toBe(STATIC_LIMIT)
  })
})

describe('scriptPaths', () => {
  it('keeps same-origin scripts once, drops third-party, other types and failed requests', () => {
    const paths = scriptPaths(
      lhr('/tx', [
        script(`${ORIGIN}/assets/a.js`),
        script(`${ORIGIN}/assets/a.js?v=1`),
        script(`${ORIGIN}/assets/gone.js`, 404),
        script('https://static.cloudflareinsights.com/beacon.min.js'),
        { url: `${ORIGIN}/assets/app.css`, resourceType: 'Stylesheet', statusCode: 200 },
      ]),
    )
    expect(paths).toEqual(['/assets/a.js'])
  })
})

describe('gzipSize', () => {
  it('is the gzip -9 size of the built file', () => {
    const dir = build({ 'assets/a.js': 'x'.repeat(5000) })
    expect(gzipSize('/assets/a.js', dir)).toBe(gz('x'.repeat(5000)))
  })
  it('throws for a missing file and for a path outside the build directory', () => {
    const dir = build({ 'assets/a.js': 'x' })
    expect(() => gzipSize('/assets/none.js', dir)).toThrow('not a file')
    expect(() => gzipSize('/../etc/passwd', dir)).toThrow('not a file')
  })
})

describe('measure and report', () => {
  const dir = build({ 'assets/a.js': 'a'.repeat(4000), 'assets/b.js': 'b'.repeat(9000) })
  const a = script(`${ORIGIN}/assets/a.js`)
  const b = script(`${ORIGIN}/assets/b.js`)

  it('sums the gzip bodies per page and takes the largest run', () => {
    const rows = measure([lhr('/tx', [a]), lhr('/tx', [a, b]), lhr('/', [])], dir)
    expect(rows).toEqual([
      { url: `${ORIGIN}/tx`, bytes: gz('a'.repeat(4000)) + gz('b'.repeat(9000)), limit: VIEWER_LIMIT, files: 2 },
      { url: `${ORIGIN}/`, bytes: 0, limit: STATIC_LIMIT, files: 0 },
    ])
  })

  it('passes under the limit and fails over it', () => {
    const ok = report([{ url: 'u', bytes: STATIC_LIMIT, limit: STATIC_LIMIT, files: 1 }])
    expect(ok.failed).toBe(false)
    const bad = report([
      { url: 'u1', bytes: 1, limit: STATIC_LIMIT, files: 1 },
      { url: 'u2', bytes: STATIC_LIMIT + 1, limit: STATIC_LIMIT, files: 3 },
    ])
    expect(bad.failed).toBe(true)
    expect(bad.text).toContain('FAIL u2  102401 / 102400 B gzip (3 files)')
    expect(bad.text).toContain('ok   u1')
  })
})
