// Aggregation of the k6 API benchmark (packages/perf/k6/api.js, ADR-0019): several CI runs to one baseline.
export const MODES = ['warm', 'cold'] as const
export type Mode = (typeof MODES)[number]
export const CASES = ['health', 'rpc', 'history_hit', 'history_miss'] as const
export type Case = (typeof CASES)[number]

type Trend = { p50: number; p95: number } | null
/** The part of `k6-api-<mode>.json` that is read here. */
export type K6Result = {
  mode: Mode
  endpoints: Record<Case, { calls: number; ok: number; total: Trend; connecting: Trend; tls: Trend; waiting: Trend }>
}

export type BenchCase = {
  /** Calls that returned 200 and calls sent, summed over the runs. */
  ok: number
  calls: number
  /** Median over the runs of the p50 and the p95 of the total time, and the lowest and highest run value of each. */
  p50Ms: number
  p95Ms: number
  p50Range: [number, number]
  p95Range: [number, number]
  /** Median over the runs of the p50 of each part (ms). */
  parts: { connectMs: number; tlsMs: number; ttfbMs: number }
}
export type ApiBench = {
  /** `YYYY-MM-DD`, UTC. */
  measuredAt: string
  /** Commit of `main` the runs used. */
  commit: string
  origin: string
  runs: number
  results: Record<Mode, Record<Case, BenchCase>>
}

const round = (x: number) => Math.round(x * 10) / 10

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  const hi = s[mid]
  const lo = s[mid - 1]
  if (hi === undefined) throw new Error('median of no values')
  return s.length % 2 === 1 || lo === undefined ? hi : (lo + hi) / 2
}

const range = (xs: number[]): [number, number] => [Math.min(...xs), Math.max(...xs)]

/** `runs` holds both modes of every run. A case with no timed 200 response in a run (no value) is an error: a baseline needs numbers. */
export function aggregate(runs: K6Result[]): Record<Mode, Record<Case, BenchCase>> {
  const pick = (mode: Mode, c: Case) => {
    const eps = runs.filter((r) => r.mode === mode).map((r) => r.endpoints[c])
    if (eps.length === 0) throw new Error(`no ${mode} run`)
    const num = (f: (e: (typeof eps)[number]) => number | undefined) =>
      eps.map((e) => {
        const v = f(e)
        if (v === undefined) throw new Error(`${mode} ${c}: a run has no timed 200 response`)
        return v
      })
    const p50 = num((e) => e.total?.p50)
    const p95 = num((e) => e.total?.p95)
    return {
      ok: eps.reduce((s, e) => s + e.ok, 0),
      calls: eps.reduce((s, e) => s + e.calls, 0),
      p50Ms: round(median(p50)),
      p95Ms: round(median(p95)),
      p50Range: range(p50),
      p95Range: range(p95),
      parts: {
        connectMs: round(median(num((e) => e.connecting?.p50))),
        tlsMs: round(median(num((e) => e.tls?.p50))),
        ttfbMs: round(median(num((e) => e.waiting?.p50))),
      },
    } satisfies BenchCase
  }
  const mode = (m: Mode) => Object.fromEntries(CASES.map((c) => [c, pick(m, c)])) as Record<Case, BenchCase>
  return { warm: mode('warm'), cold: mode('cold') }
}

/** Threshold rule (ADR-0019): 1.5 times the observed p95, rounded up to 2 significant digits (p95 193 gives 290). */
export function thresholdMs(p95Ms: number): number {
  const x = p95Ms * 1.5
  const step = 10 ** (Math.floor(Math.log10(x)) - 1)
  return Math.ceil(x / step) * step
}

const NAMES: Record<Case, string> = {
  health: '`GET /v1/health`',
  rpc: '`POST /v1/rpc` (`eth_blockNumber`)',
  history_hit: '`POST /v1/history`, cache hit',
  history_miss: '`POST /v1/history`, cache miss (Etherscan)',
}
const rangeText = (r: [number, number]) => `${String(r[0])}-${String(r[1])}`
const row = (mode: Mode, c: Case, b: BenchCase) => [
  NAMES[c],
  mode,
  `${String(b.ok)} / ${String(b.calls)}`,
  String(b.p50Ms),
  rangeText(b.p50Range),
  String(b.p95Ms),
  rangeText(b.p95Range),
  String(b.parts.connectMs),
  String(b.parts.tlsMs),
  String(b.parts.ttfbMs),
  String(thresholdMs(b.p95Ms)),
]

/** Markdown table of the aggregated benchmark. */
export function benchTable(r: ApiBench['results']): string {
  const head = [
    'Endpoint',
    'Mode',
    'ok / sent',
    'p50',
    'p50 range',
    'p95',
    'p95 range',
    'TCP p50',
    'TLS p50',
    'TTFB p50',
    'p95 limit',
  ]
  const rows = MODES.flatMap((m) => CASES.map((c) => row(m, c, r[m][c])))
  return [head, head.map(() => '---'), ...rows].map((x) => `| ${x.join(' | ')} |`).join('\n')
}

/** The limits of `packages/perf/k6/api.js`, in the shape of its `P95_LIMIT_MS` constant. */
export function limitsJs(r: ApiBench['results']): string {
  const mode = (m: Mode) => `  ${m}: { ${CASES.map((c) => `${c}: ${String(thresholdMs(r[m][c].p95Ms))}`).join(', ')} },`
  return ['const P95_LIMIT_MS = {', ...MODES.map(mode), '}'].join('\n')
}
