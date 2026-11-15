// Existing CI artifacts as evidence results (`cli.ts evidence emit --from <kind>=<file>`). One function per artifact: the CI job
// that makes the file and the person who seeds `docs/results` from an old run use the same code.
import { HERMES_LIMIT } from './baseline.ts'
import { isObj as isRecord, type ResultInput } from './evidence.ts'

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

/** The counts of a `vitest --reporter=json` file; `seconds` is the wall time from the start of the run to the end of the last file. */
function vitestCounts(json: unknown, who: string): { total: number; failed: number; seconds: number } {
  if (!isRecord(json) || typeof json.numTotalTests !== 'number' || typeof json.numFailedTests !== 'number')
    throw new Error(`${who}: expected a vitest json report (--reporter=json)`)
  const files = Array.isArray(json.testResults) ? (json.testResults as unknown[]) : []
  const ends = files.map((f) => (isRecord(f) && typeof f.endTime === 'number' ? f.endTime : NaN))
  if (typeof json.startTime !== 'number' || ends.length === 0 || ends.some(Number.isNaN))
    throw new Error(`${who}: the report has no startTime or file endTime`)
  if (json.numTotalTests < 1) throw new Error(`${who}: the report holds no test (nothing was measured)`)
  return {
    total: json.numTotalTests,
    failed: json.numFailedTests,
    seconds: Math.round(Math.max(...ends) - json.startTime) / 1000,
  }
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

export const SOURCES: Record<string, (json: unknown) => ResultInput[]> = {
  hermes: hermesResults,
  'chain-3': chain3Results,
  'chain-5': chain5Results,
  'js-budget': jsBudgetResults,
}
