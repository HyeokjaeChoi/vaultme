import { describe, expect, it } from 'vitest'
import { CASES, evaluate, MODES, SLO_MS, tierMarkdown, warnings, watchMs, type Case, type Watch } from '../src/slo.ts'

const watch = Object.fromEntries(MODES.map((m) => [m, Object.fromEntries(CASES.map((c) => [c, 100]))])) as Watch
const p95 = (over: Partial<Record<Case, number | null>>) =>
  ({ health: 50, rpc: 50, history_hit: 50, history_miss: 90, ...over }) as Record<Case, number | null>

describe('SLO_MS', () => {
  it('has the UX limits: INP 200 / 500 for user actions, 1 s for screen load, none for health', () => {
    expect(SLO_MS.warm).toEqual({ rpc: 200, history_hit: 200, history_miss: 1000 })
    expect(SLO_MS.cold).toEqual({ rpc: 500, history_hit: 500, history_miss: 1000 })
  })
})

describe('watchMs', () => {
  it('is 1.5 times the highest run p95, rounded up to a whole ms', () => {
    expect(watchMs(87.56)).toBe(132)
    expect(watchMs(657.76)).toBe(987)
    expect(watchMs(100)).toBe(150)
  })
})

describe('evaluate', () => {
  it('passes tier 1 at the limit and fails over it', () => {
    const rows = evaluate('warm', p95({ rpc: 200, history_hit: 200.1 }), watch)
    expect(rows.find((r) => r.case === 'rpc')?.sloOk).toBe(true)
    expect(rows.find((r) => r.case === 'history_hit')?.sloOk).toBe(false)
  })
  it('gives health no SLO, so it never fails tier 1', () => {
    const h = evaluate('cold', p95({ health: 99999 }), watch).find((r) => r.case === 'health')
    expect(h).toMatchObject({ slo: null, sloOk: null })
  })
  it('fails a case that has an SLO and no 200 response, and does not warn tier 2 for it', () => {
    const r = evaluate('warm', p95({ rpc: null }), watch).find((x) => x.case === 'rpc')
    expect(r).toMatchObject({ sloOk: false, watchExceeded: false })
  })
  it('flags tier 2 independently of tier 1', () => {
    const rows = evaluate('warm', p95({ health: 101, rpc: 150 }), watch)
    expect(rows.find((r) => r.case === 'health')).toMatchObject({ sloOk: null, watchExceeded: true })
    expect(rows.find((r) => r.case === 'rpc')).toMatchObject({ sloOk: true, watchExceeded: true })
  })
})

describe('warnings and markdown', () => {
  it('writes nothing when all is within both tiers', () => {
    const rows = evaluate('warm', p95({}), watch)
    expect(warnings('warm', rows)).toEqual([])
    expect(tierMarkdown('warm', rows)).not.toContain('⚠️ tier')
  })
  it('writes a ⚠️ line for tier 2 and a ❌ line for tier 1', () => {
    const rows = evaluate('warm', p95({ health: 130, rpc: 250 }), watch)
    const w = warnings('warm', rows)
    expect(w).toHaveLength(3)
    expect(w[0]).toBe(
      '⚠️ tier 2 (regression watch, does not fail the job): warm health p95 130 ms is over 100 ms (1.5 x the highest p95 of the calibration runs)',
    )
    expect(w[1]).toBe('❌ tier 1 (UX SLO): warm rpc p95 250 ms is over 200 ms')
    const md = tierMarkdown('warm', rows)
    expect(md).toContain('| `rpc` | warm | 250 | 200 | FAIL | 100 | ⚠️ over |')
    expect(md).toContain('| `health` | warm | 130 | n/a | no SLO | 100 | ⚠️ over |')
  })
  it('judges the raw p95: 200.004 fails 200 although it is shown as 200', () => {
    const rows = evaluate('warm', p95({ rpc: 200.004 }), watch)
    expect(rows.find((r) => r.case === 'rpc')?.sloOk).toBe(false)
    expect(tierMarkdown('warm', rows)).toContain('| `rpc` | warm | 200 | 200 | FAIL |')
  })
  it('prints n/a for a case with no response', () => {
    expect(warnings('cold', evaluate('cold', p95({ rpc: null }), watch))[0]).toContain('p95 n/a ms is over 500 ms')
  })
})
