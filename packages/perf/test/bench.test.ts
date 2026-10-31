import { describe, expect, it } from 'vitest'
import { aggregate, benchTable, CASES, limitsJs, median, MODES, type K6Result, type Mode } from '../src/bench.ts'
import { buildBaseline, renderBaseline } from '../src/baseline.ts'

const trend = (p50: number, p95: number) => ({ p50, p95 })
const run = (mode: Mode, p95: number, ok = 5): K6Result => ({
  mode,
  measuredAt: '2026-10-30T12:00:00.000Z',
  endpoints: Object.fromEntries(
    CASES.map((c) => [
      c,
      {
        calls: 5,
        ok,
        total: ok === 0 ? null : trend(p95 / 2, p95),
        connecting: trend(mode === 'cold' ? 30 : 0, 0),
        tls: trend(mode === 'cold' ? 40 : 0, 0),
        waiting: trend(p95 / 4, 0),
      },
    ]),
  ) as K6Result['endpoints'],
})
const runs = [100, 120, 110].flatMap((p) => MODES.map((m) => run(m, p)))

describe('median', () => {
  it('takes the middle value, or the mean of the two middle values', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 2, 3])).toBe(2.5)
  })
  it('throws on no values', () => {
    expect(() => median([])).toThrow('no values')
  })
})

describe('aggregate', () => {
  const r = aggregate(runs)
  it('uses the median of the runs and keeps the spread', () => {
    expect(r.warm.health).toMatchObject({
      ok: 15,
      calls: 15,
      p50Ms: 55,
      p95Ms: 110,
      p50Range: [50, 60],
      p95Range: [100, 120],
    })
    expect(r.cold.rpc.parts).toEqual({ connectMs: 30, tlsMs: 40, ttfbMs: 27.5 })
  })
  it('throws when a run has no timed response, or a mode has no run', () => {
    expect(() => aggregate([...runs, run('warm', 0, 0)])).toThrow('warm health: a run has no timed 200 response')
    expect(() => aggregate(runs.filter((x) => x.mode === 'warm'))).toThrow('no cold run')
  })
})

describe('tables', () => {
  const r = aggregate(runs)
  it('lists every case and mode with its tier-1 SLO and tier-2 limit', () => {
    const t = benchTable(r)
    expect(t).toContain(
      '| `GET /v1/health` | warm | 15 / 15 | 55 | 50-60 | 110 | 100-120 | 0 | 0 | 27.5 | none | 180 |',
    )
    expect(t).toContain(
      '| `POST /v1/rpc` (`eth_blockNumber`) | cold | 15 / 15 | 55 | 50-60 | 110 | 100-120 | 30 | 40 | 27.5 | 500 | 180 |',
    )
    expect(t.split('\n')).toHaveLength(2 + MODES.length * CASES.length)
  })
  it('prints the tier-2 limits (1.5 x the highest run p95) as the constant of api.js', () => {
    expect(limitsJs(r)).toBe(
      'const WATCH_P95_MS = {\n  warm: { health: 180, rpc: 180, history_hit: 180, history_miss: 180 },\n  cold: { health: 180, rpc: 180, history_hit: 180, history_miss: 180 },\n}',
    )
  })
  it('adds the section to the baseline text only when the benchmark is set', () => {
    const base = buildBaseline({
      measuredAt: '2026-10-30',
      commit: 'abc1234',
      origin: 'local test',
      desktop: [],
      mobile: [],
      jsBudget: [],
      hermes: { ios: 1, android: 1 },
      api: { health: ep(), rpc: ep(), history: ep(), address: '0xabc', historyGapMs: 31_000 },
    })
    expect(renderBaseline(base)).not.toContain('k6')
    const md = renderBaseline({
      ...base,
      apiBench: { measuredAt: '2026-10-31', commit: 'def5678', origin: 'CI', runs: 3, results: r },
    })
    expect(md).toContain('## API benchmark (staging, k6, CI runner)')
    expect(md).toContain('on commit `def5678` (CI), 3 runs')
  })
})

function ep() {
  return { n: 1, ok: 1, p50Ms: 1, p95Ms: 1 }
}
