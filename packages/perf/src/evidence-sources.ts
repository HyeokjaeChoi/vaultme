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

export const SOURCES: Record<string, (json: unknown) => ResultInput[]> = {
  hermes: hermesResults,
  'js-budget': jsBudgetResults,
  'ci-health': ciHealthResults,
}
