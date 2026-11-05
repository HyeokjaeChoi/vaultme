// Two tiers of the k6 API benchmark (ADR-0020, docs/perf/slo.md) and the release gate (ADR-0036). Pure code, no Node and no k6
// imports: `k6/api.js` imports it too.
export const MODES = ['warm', 'cold'] as const
export type Mode = (typeof MODES)[number]
export const CASES = ['health', 'rpc', 'history_hit', 'history_miss'] as const
export type Case = (typeof CASES)[number]

/**
 * Tier 1, the UX SLO: p95 of the total time in ms. Absolute and taken from UX standards, not from our own measurements
 * (docs/perf/slo.md has the sources). rpc and history_hit are user-action reads: INP "good" 200 ms on a warm connection (warm rpc:
 * 250 ms, owner decision in ADR-0035, because two upstreams set its tail),
 * the INP "needs improvement" edge 500 ms on a new one. history_miss is screen-load data: RAIL / Nielsen 1 s on both.
 * `health` is not user-facing: it has no SLO. Judged over a 4-week window of pooled requests (`sloWindow`, ADR-0036), not per run.
 */
export const SLO_MS: Record<Mode, Partial<Record<Case, number>>> = {
  warm: { rpc: 250, history_hit: 200, history_miss: 1000 },
  cold: { rpc: 500, history_hit: 500, history_miss: 1000 },
}

/** The share of requests at or under the SLO limit that meets the SLO: a p95 limit, pooled over many runs (ADR-0036). */
export const SLO_GOAL = 0.95
/** Days in the SLO window (Google SRE Workbook: a 4-week rolling window). */
export const SLO_WINDOW_DAYS = 28
/**
 * The release gate (ADR-0036): p95 of our own server time in ms, Worker time minus upstream time from the Server-Timing header.
 * Covers the middleware and route code outside `proxyRpc` (limiters, token check); `proxyRpc` itself sits
 * inside the upstream span. A latency budget, not a UX number: a quarter of the tightest user-action SLO (200 ms). It leaves out the upstreams and the network,
 * so their noise cannot fail a release. A limit here fails the `api-bench` job.
 */
export const OWN_P95_MS = 50

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

/** One line per tier-1 limit this run went over and per exceeded tier-2 limit. Neither fails the job (ADR-0036). */
export function warnings(mode: Mode, rows: Row[]): string[] {
  return rows.flatMap((r) => {
    const out: string[] = []
    if (r.sloOk === false)
      out.push(
        `⚠️ tier 1 (UX SLO, this run only; the 4-week window decides): ${mode} ${r.case} p95 ${cell(r.p95)} ms is over ${String(r.slo)} ms`,
      )
    if (r.watchExceeded)
      out.push(
        `⚠️ tier 2 (regression watch, does not fail the job): ${mode} ${r.case} p95 ${cell(r.p95)} ms is over ${String(r.watch)} ms (1.5 x the highest p95 of the calibration runs)`,
      )
    return out
  })
}

// Shown with 2 decimals; the verdict uses the raw value, so a p95 of 200.004 shows as 200 and still fails a limit of 200.
const cell = (x: number | null) => (x === null ? 'n/a' : String(Math.round(x * 100) / 100))

/** Markdown of both tiers for one mode, with the warning lines under the table. */
export function tierMarkdown(mode: Mode, rows: Row[]): string {
  const verdict = (r: Row) => (r.sloOk === null ? 'no SLO' : r.sloOk ? 'pass' : 'over')
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
    'Tier 1 = UX SLO of this run; the 4-week window (`api-slo-window`) decides it. Tier 2 = regression watch. Neither fails the job (ADR-0036). p95 and limits in ms.',
    '',
  ].join('\n')
}

/** 200 responses of one run at or under the SLO limit (`good`) of all timed requests, failed ones included (`total`), per case with an SLO. */
export type SloCount = { good: number; total: number }
export type WindowRow = {
  case: Case
  mode: Mode
  good: number
  total: number
  ratio: number | null
  ok: boolean | null
}

/**
 * Pure: pools the counts of many runs (good / total events, Google SRE Workbook). A case with no request in the window has no
 * verdict (null); it is not a breach. A run of an older script has no `slo` field and adds nothing.
 */
export function sloWindow(
  results: { mode: Mode; endpoints: Partial<Record<Case, { slo?: SloCount | null }>> }[],
): WindowRow[] {
  return MODES.flatMap((mode) =>
    CASES.filter((c) => SLO_MS[mode][c] !== undefined).map((c) => {
      let good = 0
      let total = 0
      for (const r of results) {
        const n = r.mode === mode ? r.endpoints[c]?.slo : undefined
        if (n) {
          good += n.good
          total += n.total
        }
      }
      const ratio = total === 0 ? null : good / total
      return { case: c, mode, good, total, ratio, ok: ratio === null ? null : ratio >= SLO_GOAL }
    }),
  )
}

/** Markdown of the window, one row per case and mode. */
export function windowMarkdown(rows: WindowRow[], runs: number): string {
  const pct = (x: number | null) => (x === null ? 'n/a' : `${String(Math.floor(x * 1000) / 10)}%`)
  const verdict = (r: WindowRow) => (r.ok === null ? 'no data' : r.ok ? 'pass' : 'BREACH')
  return [
    `SLO window: the last ${String(SLO_WINDOW_DAYS)} days, ${String(runs)} run(s). Goal: ${String(SLO_GOAL * 100)}% of requests at or under the limit.`,
    '',
    '| Endpoint | Mode | Limit (ms) | Good / total | Share | Verdict |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows.map(
      (r) =>
        `| \`${r.case}\` | ${r.mode} | ${String(SLO_MS[r.mode][r.case])} | ${String(r.good)} / ${String(r.total)} | ${pct(r.ratio)} | ${verdict(r)} |`,
    ),
    '',
  ].join('\n')
}
