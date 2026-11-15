// Existing CI artifacts as evidence results (`cli.ts evidence emit --from <kind>=<file>`). One function per artifact: the CI job
// that makes the file and the person who seeds `docs/results` from an old run use the same code.
import { HERMES_LIMIT } from './baseline.ts'
import type { ResultInput } from './evidence.ts'

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

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

export const SOURCES: Record<string, (json: unknown) => ResultInput[]> = {
  hermes: hermesResults,
  'js-budget': jsBudgetResults,
}
