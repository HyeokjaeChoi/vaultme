// Two tiers of the k6 API benchmark (ADR-0020, docs/perf/slo.md). Pure code, no Node and no k6 imports: `k6/api.js` imports it too.
export const MODES = ['warm', 'cold'] as const
export type Mode = (typeof MODES)[number]
export const CASES = ['health', 'rpc', 'history_hit', 'history_miss'] as const
export type Case = (typeof CASES)[number]

/**
 * Tier 1, the UX SLO: p95 of the total time in ms. Absolute and taken from UX standards, not from our own measurements
 * (docs/perf/slo.md has the sources). rpc and history_hit are user-action reads: INP "good" 200 ms on a warm connection,
 * the INP "needs improvement" edge 500 ms on a new one. history_miss is screen-load data: RAIL / Nielsen 1 s on both.
 * `health` is not user-facing: it has no SLO. A limit here fails the `api-bench` job.
 */
export const SLO_MS: Record<Mode, Partial<Record<Case, number>>> = {
  warm: { rpc: 200, history_hit: 200, history_miss: 1000 },
  cold: { rpc: 500, history_hit: 500, history_miss: 1000 },
}

/** Tier 2, the regression watch: 1.5 times the highest run p95 of the calibration runs, rounded up to a whole ms. Warning only. */
export const watchMs = (maxP95Ms: number): number => Math.ceil(maxP95Ms * 1.5)

export type Watch = Record<Mode, Record<Case, number>>
export type Row = {
  case: Case
  /** p95 of the total time of the run; null when no request returned 200. */
  p95: number | null
  slo: number | null
  /** Null when the case has no SLO. A case with an SLO and no 200 response fails. */
  sloOk: boolean | null
  watch: number
  watchExceeded: boolean
}

export function evaluate(mode: Mode, p95: Record<Case, number | null>, watch: Watch): Row[] {
  return CASES.map((c) => {
    const p = p95[c]
    const slo = SLO_MS[mode][c] ?? null
    return {
      case: c,
      p95: p,
      slo,
      sloOk: slo === null ? null : p !== null && p <= slo,
      watch: watch[mode][c],
      watchExceeded: p !== null && p > watch[mode][c],
    }
  })
}

/** One line per failed tier-1 limit and per exceeded tier-2 limit. Only the first kind fails the job. */
export function warnings(mode: Mode, rows: Row[]): string[] {
  return rows.flatMap((r) => {
    const out: string[] = []
    if (r.sloOk === false)
      out.push(`❌ tier 1 (UX SLO): ${mode} ${r.case} p95 ${cell(r.p95)} ms is over ${String(r.slo)} ms`)
    if (r.watchExceeded)
      out.push(
        `⚠️ tier 2 (regression watch, does not fail the job): ${mode} ${r.case} p95 ${String(r.p95)} ms is over ${String(r.watch)} ms (1.5 x the highest p95 of the calibration runs)`,
      )
    return out
  })
}

const cell = (x: number | null) => (x === null ? 'n/a' : String(x))

/** Markdown of both tiers for one mode, with the warning lines under the table. */
export function tierMarkdown(mode: Mode, rows: Row[]): string {
  const verdict = (r: Row) => (r.sloOk === null ? 'no SLO' : r.sloOk ? 'pass' : 'FAIL')
  const table = rows.map(
    (r) =>
      `| \`${r.case}\` | ${mode} | ${cell(r.p95)} | ${cell(r.slo)} | ${verdict(r)} | ${String(r.watch)} | ${r.watchExceeded ? '⚠️ over' : 'ok'} |`,
  )
  const lines = warnings(mode, rows)
  return [
    '| Endpoint | Mode | p95 | Tier 1 SLO | Tier 1 | Tier 2 limit | Tier 2 |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...table,
    '',
    ...(lines.length ? [...lines.map((l) => `- ${l}`), ''] : []),
    'Tier 1 = UX SLO, fails the job (docs/perf/slo.md). Tier 2 = regression watch, warning only. p95 and limits in ms.',
    '',
  ].join('\n')
}
