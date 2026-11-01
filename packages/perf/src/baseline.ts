import { benchTable, type ApiBench } from './bench.ts'
import type { ApiLatency, Endpoint } from './latency.ts'
import type { HermesSizes, PageScores } from './summarize.ts'

/** The Hermes limit of `export:check` (apps/mobile/package.json): 11 MiB (ADR-0024). */
export const HERMES_LIMIT = 11 * 1024 * 1024

export type JsBudgetRow = { url: string; bytes: number; limit: number; files: number }

export type Baseline = {
  /** `YYYY-MM-DD`, UTC. */
  measuredAt: string
  commit: string
  /** Where the numbers came from (for example `local macOS` or a GitHub runner). Local and runner numbers are not comparable. */
  origin: string
  web: { desktop: PageScores[]; mobile: PageScores[]; jsBudget: JsBudgetRow[] }
  hermes: HermesSizes & { limit: number }
  api: ApiLatency & { address: string; historyGapMs: number }
  /** k6 runs on a CI runner (`packages/perf/k6/api.js`); set by `cli.ts bench`. */
  apiBench?: ApiBench
}

export type BaselineInput = Omit<Baseline, 'hermes' | 'web'> & {
  desktop: PageScores[]
  mobile: PageScores[]
  /** `js-budget.ts` rows: URLs of the local server; only the path is kept. */
  jsBudget: JsBudgetRow[]
  hermes: HermesSizes
}

const path = (u: string) => {
  const p = new URL(u)
  return p.pathname + p.search
}

export function buildBaseline(i: BaselineInput): Baseline {
  return {
    measuredAt: i.measuredAt,
    commit: i.commit,
    origin: i.origin,
    web: {
      desktop: i.desktop,
      mobile: i.mobile,
      jsBudget: i.jsBudget.map((r) => ({ ...r, url: path(r.url) })).sort((a, b) => a.url.localeCompare(b.url)),
    },
    hermes: { ...i.hermes, limit: HERMES_LIMIT },
    api: i.api,
  }
}

const mib = (b: number) => (b / 1024 / 1024).toFixed(2)
const table = (head: string[], rows: string[][]) =>
  [head, head.map(() => '---'), ...rows].map((r) => `| ${r.join(' | ')} |`).join('\n')

const ENDPOINTS: [Endpoint, string][] = [
  ['health', '`GET /v1/health`'],
  ['rpc', '`POST /v1/rpc` (`eth_blockNumber`)'],
  ['history', '`POST /v1/history`'],
]

/** The API latency table. Also the job summary of the weekly workflow. */
export function latencyTable(api: ApiLatency): string {
  return table(
    ['Endpoint', 'Calls ok / sent', 'p50 (ms)', 'p95 (ms)'],
    ENDPOINTS.map(([k, name]) => [
      name,
      `${String(api[k].ok)} / ${String(api[k].n)}`,
      String(api[k].p50Ms ?? 'n/a'),
      String(api[k].p95Ms ?? 'n/a'),
    ]),
  )
}

function lighthouseTable(rows: PageScores[]): string {
  return table(
    ['Page', 'Perf', 'A11y', 'BP', 'SEO', 'LCP (ms)', 'CLS', 'TBT (ms)'],
    rows.map((r) => [
      `\`${r.url}\``,
      ...[r.performance, r.accessibility, r.bestPractices, r.seo, r.lcpMs, r.cls, r.tbtMs].map(String),
    ]),
  )
}

export function renderBaseline(b: Baseline): string {
  const runs = (rows: PageScores[]) => rows[0]?.runs ?? 0
  return `# Performance baseline

Measured ${b.measuredAt} on commit \`${b.commit}\` (${b.origin}). Source of truth for the numbers: \`baseline.json\` (this file is generated from it).
Storage and procedure: [ADR-0019](../adr/0019-performance-measurements-and-baseline.md). These are measurements, not limits; the SLOs are in [slo.md](slo.md) and the limits stay in \`apps/web/lighthouserc.*.json\`, \`apps/web/scripts/js-budget.ts\` and \`apps/mobile/package.json\`.

## Web: Lighthouse

Median of the runs per page, on the build served by \`wrangler dev\`. Scores are 0 to 100; BP = best practices.

### Desktop (${String(runs(b.web.desktop))} runs per page)

${lighthouseTable(b.web.desktop)}

### Mobile (${String(runs(b.web.mobile))} runs per page)

${lighthouseTable(b.web.mobile)}

## Web: JS budget (ADR-0018)

Gzip bytes of the app's own JS per page.

${table(
  ['Page', 'Bytes', 'Limit', 'Files'],
  b.web.jsBudget.map((r) => [`\`${r.url}\``, String(r.bytes), String(r.limit), String(r.files)]),
)}

## Mobile: Hermes bundle

${table(
  ['Platform', 'Bytes', 'MiB', 'Limit (MiB)'],
  (['ios', 'android'] as const).map((p) => [p, String(b.hermes[p]), mib(b.hermes[p]), mib(b.hermes.limit)]),
)}

## API latency (staging)

Timed from one machine, so it includes the network path to Cloudflare. Calls: ${String(b.api.health.n)} health, ${String(b.api.rpc.n)} rpc, ${String(b.api.history.n)} history, in that order, one at a time.
History reads the public test address \`${b.api.address}\`, ${String(b.api.historyGapMs / 1000)} s apart, so each call is newer than the 30 s page cache.

${latencyTable(b.api)}
${b.apiBench ? benchSection(b.apiBench) : ''}`
}

function benchSection(a: ApiBench): string {
  return `
## API benchmark (staging, k6, CI runner)

Measured ${a.measuredAt} on commit \`${a.commit}\` (${a.origin}), ${String(a.runs)} runs of \`api-bench\` ([README](../../packages/perf/README.md)). Times in ms, total = DNS + TCP + TLS + request + response (HTTP 200 only).
p50 and p95 are the median over the runs; the range columns are the lowest and highest run value (the spread). TCP, TLS and TTFB are medians of the run p50 (0 TCP and TLS in the warm mode: the connection is reused).
Tier 1 SLO: absolute UX limit on the p95, from web.dev and Nielsen ([slo.md](slo.md), [ADR-0020](../adr/0020-api-ux-slo-and-regression-watch.md)); it fails the \`api-bench\` job only. Tier 2 limit: 1.5 times the highest run p95 of the range column, rounded up; it only warns.
The \`history_hit\` case has no cache marker in the response; a cold-mode hit that reached another Cloudflare server shows up as a slow outlier.

${benchTable(a.results)}
`
}
