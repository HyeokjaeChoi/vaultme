// Existing CI artifacts as evidence results (`cli.ts evidence emit --from <kind>=<file>`). One function per artifact: the CI job
// that makes the file and the person who seeds `docs/results` from an old run use the same code.
import { HERMES_LIMIT } from './baseline.ts'
import { isObj as isRecord, type ResultInput } from './evidence.ts'
import { loadResults, type LoadSummary } from './load.ts'

/** `perf-hermes.json` (`cli.ts hermes`): the bytes of the one Hermes bundle per platform against the 11 MiB limit of `export:check`. */
export function hermesResults(json: unknown): ResultInput[] {
  if (!isRecord(json)) throw new Error('hermes: expected {"ios": bytes, "android": bytes}')
  return (['ios', 'android'] as const).map((p) => {
    const bytes = json[p]
    if (typeof bytes !== 'number') throw new Error(`hermes: ${p} is not a number`)
    return {
      metric: `Hermes bundle, ${p}`,
      value: bytes,
      unit: 'B',
      threshold: { op: '<=', value: HERMES_LIMIT },
      n: 1,
      window: 'one build',
    }
  })
}

/** `js-budget.json` (`apps/web/scripts/js-budget.ts`): the gzip bytes of the app's own JS per page against that page's limit. */
export function jsBudgetResults(json: unknown): ResultInput[] {
  if (!Array.isArray(json) || json.length === 0) throw new Error('js-budget: expected a list of {url, bytes, limit}')
  return (json as unknown[]).map((row, i) => {
    if (!isRecord(row) || typeof row.url !== 'string' || typeof row.bytes !== 'number' || typeof row.limit !== 'number')
      throw new Error(`js-budget: row ${String(i)} needs url, bytes and limit`)
    const page = new URL(row.url)
    return {
      metric: `JS gzip, ${page.pathname}`,
      value: row.bytes,
      unit: 'B',
      threshold: { op: '<=', value: row.limit },
      n: 1,
      window: 'one build',
    }
  })
}

/** `k6-load.json` (`k6/load.js`, gate LOAD-1): one result per threshold of the run. */
export function loadSourceResults(json: unknown): ResultInput[] {
  if (!isRecord(json) || typeof json.measuredAt !== 'string' || !isRecord(json.values))
    throw new Error('load: expected {"measuredAt": text, "values": {metric: {...}}}')
  return loadResults(json as unknown as LoadSummary)
}

/**
 * The counts of a `vitest --reporter=json` file. `total` is the tests that ran (passed + failed): a skipped or todo test is not
 * a case that was measured. A test file that cannot load counts as a failure (it is in `numFailedTestSuites`, not in the tests).
 * `seconds` is the wall time from the start of the run to the end of the last file.
 */
function vitestCounts(json: unknown, who: string): { total: number; failed: number; seconds: number } {
  const num = (k: string): number => {
    const v = isRecord(json) ? json[k] : undefined
    if (typeof v !== 'number')
      throw new Error(`${who}: expected a vitest json report (--reporter=json): ${k} is missing`)
    return v
  }
  const total = num('numPassedTests') + num('numFailedTests')
  const failed = num('numFailedTests') + num('numFailedTestSuites')
  const files = isRecord(json) && Array.isArray(json.testResults) ? (json.testResults as unknown[]) : []
  const ends = files.map((f) => (isRecord(f) && typeof f.endTime === 'number' ? f.endTime : NaN))
  if (num('startTime') < 0 || ends.length === 0 || ends.some(Number.isNaN))
    throw new Error(`${who}: the report has no startTime or file endTime`)
  if (total < 1) throw new Error(`${who}: the report holds no test that ran (nothing was measured)`)
  return { total, failed, seconds: Math.round(Math.max(...ends) - num('startTime')) / 1000 }
}

/** CHAIN-3: the vitest report of `pnpm --filter @vaultme/mobile test:anvil`: 9 cases (an `it.fails` counts as a pass), 0 fails, suite <= 60 s. */
export function chain3Results(json: unknown): ResultInput[] {
  const c = vitestCounts(json, 'chain-3')
  const window = 'one run'
  return [
    {
      metric: 'Anvil send lifecycle: cases',
      value: c.total,
      unit: 'cases',
      threshold: { op: '==', value: 9 },
      n: c.total,
      window,
    },
    {
      metric: 'Anvil send lifecycle: failed cases',
      value: c.failed,
      unit: 'cases',
      threshold: { op: '==', value: 0 },
      n: c.total,
      window,
    },
    {
      metric: 'Anvil send lifecycle: suite time',
      value: c.seconds,
      unit: 's',
      threshold: { op: '<=', value: 60 },
      n: 1,
      window,
    },
  ]
}

/**
 * CHAIN-5: the vitest report of the property tests: one test per property, a counterexample is a failed test. The runs per
 * property are configuration, not a measurement: the job passes them as `--result` (see packages/perf/README.md).
 */
export function chain5Results(json: unknown): ResultInput[] {
  const c = vitestCounts(json, 'chain-5')
  const window = 'one run'
  return [
    { metric: 'Properties tested', value: c.total, unit: 'properties', threshold: null, n: c.total, window },
    {
      metric: 'Properties with a counterexample',
      value: c.failed,
      unit: 'properties',
      threshold: { op: '==', value: 0 },
      n: c.total,
      window,
    },
  ]
}

/** The window each metric really covers: 28 days of main, the last 10 green runs, or the state at the time of the run. */
const ciWindow = (name: string): string =>
  name.startsWith('Red main') ? '28 days' : /^(PR CI|`?verify`?)/.test(name) ? 'last 10 green runs' : 'snapshot'

/** The metrics `cli.ts ci-health --json` writes (gate OBS-1): each against its limit; a metric with no sample (no open issue) is left out. */
export function ciHealthResults(json: unknown): ResultInput[] {
  if (!Array.isArray(json)) throw new Error('ci-health: expected an array of metrics')
  return json.flatMap((m: Record<string, unknown>) => {
    if (
      typeof m.name !== 'string' ||
      typeof m.value !== 'number' ||
      typeof m.limit !== 'number' ||
      typeof m.unit !== 'string' ||
      typeof m.n !== 'number'
    )
      throw new Error('ci-health: a metric has no name, value, unit, limit and n')
    // The age of the last green api-bench has n 0 when there is none: that worst case (9999 days) must stay in the evidence.
    const worst = m.n < 1 && m.name.startsWith('Age of the last green')
    if (m.n < 1 && !worst) return []
    return [
      {
        // Backticks of the table name would break the evidence text rule.
        metric: m.name.replaceAll('`', ''),
        value: m.value,
        unit: m.unit,
        threshold: { op: '<=' as const, value: m.limit },
        n: worst ? 1 : m.n,
        window: ciWindow(m.name),
      },
    ]
  })
}

/**
 * MUT-1: the `reports/mutation/mutation.json` of one Stryker run (`packages/*`, reporter `json`). The score is Stryker's own:
 * (killed + timeout) / (killed + timeout + survived + no coverage); ignored, compile-error and runtime-error mutants are not counted.
 * The floor is `thresholds.break` of the run's config, which the report carries. The package is the folder name of `projectRoot`.
 */
export function mutationResults(json: unknown): ResultInput[] {
  const files = isRecord(json) && isRecord(json.files) ? Object.values(json.files) : null
  const floor = isRecord(json) && isRecord(json.thresholds) ? json.thresholds.break : undefined
  const root = isRecord(json) ? json.projectRoot : undefined
  if (!files || typeof floor !== 'number' || typeof root !== 'string')
    throw new Error('mutation: expected a Stryker json report with files, thresholds.break and projectRoot')
  const count: Record<string, number> = {}
  for (const f of files) {
    const mutants = isRecord(f) && Array.isArray(f.mutants) ? (f.mutants as unknown[]) : []
    for (const m of mutants) {
      const status = isRecord(m) && typeof m.status === 'string' ? m.status : ''
      count[status] = (count[status] ?? 0) + 1
    }
  }
  const n = (k: string): number => count[k] ?? 0
  const detected = n('Killed') + n('Timeout')
  const valid = detected + n('Survived') + n('NoCoverage')
  if (valid < 1) throw new Error('mutation: the report holds no mutant that ran (nothing was measured)')
  return [
    {
      metric: `Mutation score, ${root.split('/').filter(Boolean).at(-1) ?? 'package'}`,
      value: Math.round((detected / valid) * 10_000) / 100,
      unit: '%',
      threshold: { op: '>=', value: floor },
      n: valid,
      window: 'one run',
    },
  ]
}

export const SOURCES: Record<string, (json: unknown) => ResultInput[]> = {
  hermes: hermesResults,
  'chain-3': chain3Results,
  'chain-5': chain5Results,
  mutation: mutationResults,
  'js-budget': jsBudgetResults,
  load: loadSourceResults,
  'ci-health': ciHealthResults,
}
