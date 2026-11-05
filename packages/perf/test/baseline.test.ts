import { describe, expect, it } from 'vitest'
import { HERMES_LIMIT, buildBaseline, latencyTable, renderBaseline } from '../src/baseline.ts'
import type { PageScores } from '../src/summarize.ts'

const page = (url: string): PageScores => ({
  url,
  runs: 3,
  performance: 99,
  accessibility: 100,
  bestPractices: 96,
  seo: 100,
  lcpMs: 900,
  cls: 0.012,
  tbtMs: 10,
})
const ep = (p50: number | null) => ({
  n: 20,
  ok: p50 === null ? 0 : 20,
  p50Ms: p50,
  p95Ms: p50 === null ? null : p50 * 2,
})

const baseline = buildBaseline({
  measuredAt: '2026-10-30',
  commit: 'abc1234',
  origin: 'local test',
  desktop: [page('/')],
  mobile: [page('/'), page('/en/')],
  jsBudget: [
    { url: 'http://localhost:8799/en/', bytes: 90_000, limit: 102_400, files: 4 },
    { url: 'http://localhost:8799/', bytes: 80_000, limit: 102_400, files: 3 },
  ],
  hermes: { ios: 5 * 1024 * 1024, android: 6 * 1024 * 1024 },
  api: { health: ep(40), rpc: ep(120), history: ep(null), address: '0xabc', historyGapMs: 31_000 },
})

describe('buildBaseline', () => {
  it('keeps the path of each JS budget row, sorted, and adds the Hermes limit', () => {
    expect(baseline.web.jsBudget.map((r) => r.url)).toEqual(['/', '/en/'])
    expect(baseline.hermes.limit).toBe(HERMES_LIMIT)
    expect(HERMES_LIMIT).toBe(11_534_336)
  })
})

describe('renderBaseline', () => {
  const md = renderBaseline(baseline)
  it('shows every section with its numbers', () => {
    expect(md).toContain('Measured 2026-10-30 on commit `abc1234` (local test)')
    expect(md).toContain('### Desktop (3 runs per page)')
    expect(md).toContain('| `/en/` | 99 | 100 | 96 | 100 | 900 | 0.012 | 10 |')
    expect(md).toContain('| `/` | 80000 | 102400 | 3 |')
    expect(md).toContain('| ios | 5242880 | 5.00 | 11.00 |')
    expect(md).toContain('31 s apart')
  })
  it('writes n/a for an endpoint without a successful call', () => {
    expect(latencyTable(baseline.api)).toContain('| `POST /v1/history` | 0 / 20 | n/a | n/a |')
    expect(md).toContain('| `GET /v1/health` | 20 / 20 | 40 | 80 |')
  })
})
