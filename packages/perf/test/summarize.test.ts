import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { hermesSizes, percentile, readLhrDir, summarizeLhrs } from '../src/summarize.ts'

const lhr = (url: string, perf: number, lcp: number) => ({
  requestedUrl: url,
  categories: {
    performance: { score: perf },
    accessibility: { score: 1 },
    'best-practices': { score: 0.96 },
    seo: { score: null },
  },
  audits: {
    'largest-contentful-paint': { numericValue: lcp },
    'cumulative-layout-shift': { numericValue: 0.0123 },
    'total-blocking-time': { numericValue: 10.4 },
  },
})

describe('percentile', () => {
  it('uses the nearest rank', () => {
    const v = [5, 1, 4, 2, 3]
    expect(percentile(v, 50)).toBe(3)
    expect(percentile(v, 95)).toBe(5)
    expect(percentile([7], 95)).toBe(7)
  })
  it('is null for no values', () => expect(percentile([], 50)).toBeNull())
})

describe('summarizeLhrs', () => {
  it('takes the median per path and drops the origin', () => {
    const rows = summarizeLhrs([
      lhr('http://localhost:8799/en/', 0.99, 900),
      lhr('http://localhost:8799/en/', 0.97, 1100),
      lhr('http://localhost:8799/en/', 1, 700),
      lhr('http://localhost:8799/', 1, 500),
    ])
    expect(rows.map((r) => r.url)).toEqual(['/', '/en/'])
    expect(rows[1]).toEqual({
      url: '/en/',
      runs: 3,
      performance: 99,
      accessibility: 100,
      bestPractices: 96,
      seo: 0, // a null score (skipped category) counts as 0, never as a pass
      lcpMs: 900,
      cls: 0.012,
      tbtMs: 10,
    })
  })

  it('reads lhr files from a directory and refuses an empty one', () => {
    const dir = mkdtempSync(join(tmpdir(), 'perf-lhr-'))
    expect(() => readLhrDir(dir)).toThrow('no lhr-')
    writeFileSync(join(dir, 'lhr-1.json'), JSON.stringify(lhr('http://localhost:8799/', 1, 500)))
    writeFileSync(join(dir, 'js-budget.json'), 'not read')
    expect(readLhrDir(dir)).toHaveLength(1)
  })
})

describe('hermesSizes', () => {
  const make = (files: string[]) => {
    const dist = mkdtempSync(join(tmpdir(), 'perf-hbc-'))
    for (const f of files) {
      mkdirSync(join(dist, f, '..'), { recursive: true })
      writeFileSync(join(dist, f), f.includes('ios') ? 'x'.repeat(10) : 'y'.repeat(20))
    }
    return dist
  }

  it('sizes the one bundle per platform', () => {
    const dist = make(['_expo/static/js/ios/e-1.hbc', '_expo/static/js/android/e-2.hbc', 'metadata.json'])
    expect(hermesSizes(dist)).toEqual({ ios: 10, android: 20 })
  })

  it('throws when a platform has no bundle or two', () => {
    expect(() => hermesSizes(make(['js/ios/a.hbc']))).toThrow('android')
    expect(() => hermesSizes(make(['js/ios/a.hbc', 'js/ios/b.hbc', 'js/android/c.hbc']))).toThrow('ios')
  })
})
