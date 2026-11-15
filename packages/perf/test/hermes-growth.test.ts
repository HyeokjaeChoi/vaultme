import { describe, expect, it } from 'vitest'
import { GROWTH_LIMIT, growthReport, hermesGrowth } from '../src/hermes-growth.ts'

const base = { ios: 10_236_843, android: 10_227_578 }

describe('hermesGrowth', () => {
  it('warns above 100 KiB and not at it, per platform', () => {
    const rows = hermesGrowth({ ios: base.ios + GROWTH_LIMIT, android: base.android + GROWTH_LIMIT + 1 }, base)
    expect(rows.map((r) => [r.platform, r.delta, r.warn])).toEqual([
      ['ios', GROWTH_LIMIT, false],
      ['android', GROWTH_LIMIT + 1, true],
    ])
  })
  it('does not warn when a bundle shrinks', () => {
    expect(hermesGrowth({ ios: base.ios - 5_000_000, android: base.android }, base).every((r) => !r.warn)).toBe(true)
  })
})

describe('growthReport', () => {
  it('shows the change and the share of the limit, and one warning line per platform over', () => {
    const md = growthReport(hermesGrowth({ ios: base.ios + 204_800, android: base.android - 1024 }, base))
    expect(md).toContain('| ios | 10236843 B | 10441643 B | +200.0 KiB | 90.5 % | WARNING |')
    expect(md).toContain('| android | 10227578 B | 10226554 B | -1.0 KiB | 88.7 % | ok |')
    expect(md.match(/::warning/g)).toHaveLength(1)
    expect(md).toContain('::warning title=Hermes bundle grew::ios grew by 200.0 KiB against main')
  })
  it('prints no warning line when nothing grew', () => {
    expect(growthReport(hermesGrowth(base, base))).not.toContain('::warning')
  })
})
