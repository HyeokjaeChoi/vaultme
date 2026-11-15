// Weekly CI health report (gate OBS-1, `.github/workflows/ci-health.yml`). Pure code: `cli.ts ci-health` reads GitHub with `gh`
// and passes the data in, so the numbers are tested on fixtures. Report-only: a breach opens one issue and blocks nothing.

export type Run = { conclusion: string | null; createdAt: string; updatedAt: string }
export type Dated = { number: number; createdAt: string }
export type Input = {
  /** ISO time of the report. */
  now: string
  /** `ci` runs of `main` (event push) created in the last 28 days, completed. */
  mainRuns: Run[]
  /** The last 10 green `ci` runs of pull requests. */
  prRuns: Run[]
  /** Minutes the `verify` job took in those runs. */
  verifyMinutes: number[]
  /** Open issues with the label `flaky`. */
  flaky: Dated[]
  /** `createdAt` of the newest green `api-bench` run, or null when there is none. */
  lastGreenBench: string | null
  workflows: { name: string; state: string }[]
  /** Open pull requests of Renovate. */
  renovate: Dated[]
  cacheBytes: number
}

export type Metric = {
  name: string
  value: number
  unit: string
  /** The value is a breach when it is above this. */
  limit: number
  /** Samples behind the value. */
  n: number
  breach: boolean
}

/** Warn thresholds (plan `docs/plans/quality-gates.md` OBS-1). */
export const LIMITS = {
  mainRedPercent: 2,
  prWallMinutes: 12.5,
  verifyMinutes: 6.3,
  flakyDays: 14,
  benchDays: 8,
  renovateDays: 14,
  // 90 % of the 10 GB default Actions cache limit: above it the cache of `main` gets evicted.
  cacheGiB: 9,
} as const

const DAY = 86_400_000
const MINUTE = 60_000

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? (s[m] ?? 0) : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2
}

const round = (x: number, d = 1): number => Math.round(x * 10 ** d) / 10 ** d
const ageDays = (now: string, then: string): number => (Date.parse(now) - Date.parse(then)) / DAY
const minutes = (r: Run): number => (Date.parse(r.updatedAt) - Date.parse(r.createdAt)) / MINUTE

/**
 * The metrics of the week. A metric with no samples is left out (nothing to judge), except the two that must always have one:
 * the age of the last green `api-bench` and the workflow states.
 */
export function evaluate(i: Input): Metric[] {
  const out: Metric[] = []
  const add = (name: string, value: number, unit: string, limit: number, n: number) =>
    out.push({ name, value, unit, limit, n, breach: value > limit })

  const done = i.mainRuns.filter((r) => r.conclusion === 'success' || r.conclusion === 'failure')
  if (done.length > 0)
    add(
      'Red main: failed `ci` runs on main, 28 days',
      round((done.filter((r) => r.conclusion === 'failure').length / done.length) * 100),
      '%',
      LIMITS.mainRedPercent,
      done.length,
    )
  const pr = median(i.prRuns.map(minutes))
  if (pr !== null)
    add('PR CI wall time, median of the last green runs', round(pr), 'min', LIMITS.prWallMinutes, i.prRuns.length)
  const verify = median(i.verifyMinutes)
  if (verify !== null)
    add(
      '`verify` job, median of the last green runs',
      round(verify),
      'min',
      LIMITS.verifyMinutes,
      i.verifyMinutes.length,
    )

  const oldest = (xs: Dated[]): number => Math.max(0, ...xs.map((x) => ageDays(i.now, x.createdAt)))
  add('Oldest open `flaky` issue', round(oldest(i.flaky)), 'days', LIMITS.flakyDays, i.flaky.length)
  // No green run at all is the worst case, not a missing sample.
  add(
    'Age of the last green `api-bench`',
    i.lastGreenBench === null ? 9999 : round(ageDays(i.now, i.lastGreenBench)),
    'days',
    LIMITS.benchDays,
    i.lastGreenBench === null ? 0 : 1,
  )
  add(
    'Workflows that are not active',
    i.workflows.filter((w) => w.state !== 'active').length,
    'workflows',
    0,
    i.workflows.length,
  )
  add('Oldest open Renovate pull request', round(oldest(i.renovate)), 'days', LIMITS.renovateDays, i.renovate.length)
  add('Actions cache size', round(i.cacheBytes / 1024 ** 3, 2), 'GiB', LIMITS.cacheGiB, 1)
  return out
}

/** The job summary and the issue body. */
export function ciHealthMarkdown(metrics: Metric[], notActive: string[] = []): string {
  const rows = metrics.map(
    (m) =>
      `| ${m.name} | ${String(m.value)} ${m.unit} | \`<= ${String(m.limit)}\` | ${String(m.n)} | ${m.breach ? 'BREACH' : 'ok'} |`,
  )
  return [
    '| Metric | Value | Limit | n | Result |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    '',
    ...(notActive.length > 0 ? [`Not active: ${notActive.join(', ')}.`, ''] : []),
  ].join('\n')
}

export const hasBreach = (metrics: Metric[]): boolean => metrics.some((m) => m.breach)
