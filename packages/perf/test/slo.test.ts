import { describe, expect, it } from 'vitest'
import {
  CASES,
  evaluate,
  MODES,
  OWN_P95_MS,
  SLO_MS,
  sloWindow,
  tierMarkdown,
  warnings,
  watchMs,
  windowMarkdown,
  type Case,
  type Watch,
} from '../src/slo.ts'

const watch = Object.fromEntries(MODES.map((m) => [m, Object.fromEntries(CASES.map((c) => [c, 100]))])) as Watch
const p95 = (over: Partial<Record<Case, number | null>>) =>
  ({ health: 50, rpc: 50, history_hit: 50, history_miss: 90, ...over }) as Record<Case, number | null>

describe('SLO_MS', () => {
  it('has the UX limits: INP 200 / 500 for user actions (warm rpc 250, ADR-0035), 1 s for screen load, none for health', () => {
    expect(SLO_MS.warm).toEqual({ rpc: 250, history_hit: 200, history_miss: 1000 })
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
  it('writes a ⚠️ line for tier 2 and for a tier 1 miss of this run', () => {
    const rows = evaluate('warm', p95({ health: 130, rpc: 300 }), watch)
    const w = warnings('warm', rows)
    expect(w).toHaveLength(3)
    expect(w[0]).toBe(
      '⚠️ tier 2 (regression watch, does not fail the job): warm health p95 130 ms is over 100 ms (1.5 x the highest p95 of the calibration runs)',
    )
    expect(w[1]).toBe(
      '⚠️ tier 1 (UX SLO, this run only; the 4-week window decides): warm rpc p95 300 ms is over 250 ms',
    )
    const md = tierMarkdown('warm', rows)
    expect(md).toContain('| `rpc` | warm | 300 | 250 | over | 100 | ⚠️ over |')
    expect(md).toContain('| `health` | warm | 130 | n/a | no SLO | 100 | ⚠️ over |')
  })
  it('judges the raw p95: 250.004 fails 250 although it is shown as 250', () => {
    const rows = evaluate('warm', p95({ rpc: 250.004 }), watch)
    expect(rows.find((r) => r.case === 'rpc')?.sloOk).toBe(false)
    expect(tierMarkdown('warm', rows)).toContain('| `rpc` | warm | 250 | 250 | over |')
  })
  it('prints n/a for a case with no response', () => {
    expect(warnings('cold', evaluate('cold', p95({ rpc: null }), watch))[0]).toContain('p95 n/a ms is over 500 ms')
  })
})

describe('OWN_P95_MS', () => {
  it('is a quarter of the tightest user-action SLO (ADR-0036)', () => {
    const tightest = Math.min(...MODES.flatMap((m) => [SLO_MS[m].rpc ?? Infinity, SLO_MS[m].history_hit ?? Infinity]))
    expect(OWN_P95_MS).toBe(tightest / 4)
  })
})

describe('sloWindow', () => {
  const run = (mode: 'warm' | 'cold', rpc: { good: number; total: number } | null) => ({
    mode,
    endpoints: { rpc: { slo: rpc } },
  })
  it('sums the counts of 3 runs: 95 / 100 = 95% meets the goal', () => {
    const n = (good: number, total: number) => run('warm', { good, total })
    const rows = sloWindow([n(28, 30), n(29, 30), n(38, 40)])
    expect(rows.find((r) => r.case === 'rpc' && r.mode === 'warm')).toMatchObject({ good: 95, total: 100, ok: true })
  })
  it('breaches under 95%, per mode', () => {
    const rows = sloWindow([run('cold', { good: 94, total: 100 }), run('warm', { good: 30, total: 30 })])
    expect(rows.find((r) => r.case === 'rpc' && r.mode === 'cold')?.ok).toBe(false)
    expect(rows.find((r) => r.case === 'rpc' && r.mode === 'warm')?.ok).toBe(true)
  })
  it('has no verdict without data, skips old runs with no counts, and has no health row', () => {
    const rows = sloWindow([run('warm', null)])
    expect(rows.find((r) => r.case === 'rpc' && r.mode === 'warm')).toMatchObject({ total: 0, ratio: null, ok: null })
    expect(rows.some((r) => r.case === 'health')).toBe(false)
    expect(rows).toHaveLength(6)
  })
  it('writes one markdown row per case and mode', () => {
    const md = windowMarkdown(sloWindow([run('cold', { good: 94, total: 100 })]), 1)
    expect(md).toContain('| `rpc` | cold | 500 | 94 / 100 | 94% | BREACH |')
    expect(md).toContain('| `rpc` | warm | 250 | 0 / 0 | n/a | no data |')
  })
})
