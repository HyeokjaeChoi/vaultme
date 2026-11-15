// API availability SLO (gate API-6, ADR-0046): good = a response below 500, per route, 99.5 % over 28 days, judged only with
// at least 1,000 requests. Pure code: the SQL for the Workers Analytics Engine `request` points (apps/api/src/metrics.ts) and the
// judgement of its rows. A breach opens an issue and blocks nothing.
export const AVAILABILITY_GOAL = 0.995
export const MIN_REQUESTS = 1000
export const WINDOW_DAYS = 28

/** One row per route and status. `SUM(_sample_interval)` undoes the sampling Analytics Engine applies at high volume. */
export const availabilitySql = (dataset: string): string => {
  if (!/^[a-z0-9_]+$/.test(dataset)) throw new Error(`availability: bad dataset name "${dataset}"`)
  return `SELECT blob1 AS route, blob2 AS status, SUM(_sample_interval) AS requests FROM ${dataset} WHERE index1 = 'request' AND timestamp > NOW() - INTERVAL '${String(WINDOW_DAYS)}' DAY GROUP BY route, status`
}

export type Row = { route: string; status: string; requests: number }
export type RouteAvailability = {
  route: string
  total: number
  good: number
  /** good / total; null when there were no requests. */
  ratio: number | null
  /** Null when the route has too few requests to judge. */
  ok: boolean | null
}

/** Rows as the SQL API returns them (numbers may arrive as strings). A row of another shape is an error, never a silent zero. */
export function parseRows(json: unknown): Row[] {
  const data = (json as { data?: unknown } | null)?.data
  if (!Array.isArray(data)) throw new Error('availability: expected {"data": [...]}')
  // Nothing measured is not a pass: a wrong dataset, or no request point in 28 days, must fail the run.
  if (data.length === 0) throw new Error('availability: the query returned no rows')
  return data.map((r: Record<string, unknown>, i) => {
    const requests = typeof r.requests === 'number' || typeof r.requests === 'string' ? Number(r.requests) : NaN
    if (typeof r.route !== 'string' || typeof r.status !== 'string' || !Number.isFinite(requests) || requests < 0)
      throw new Error(`availability: row ${String(i)} has no route, status and request count`)
    return { route: r.route, status: r.status, requests }
  })
}

/** Good is a status below 500 (a 429 or a 401 is the API doing its job); an unparsable status counts as bad. */
export function evaluateAvailability(rows: Row[]): RouteAvailability[] {
  const by = new Map<string, { total: number; good: number }>()
  for (const r of rows) {
    const s = by.get(r.route) ?? { total: 0, good: 0 }
    s.total += r.requests
    const code = Number(r.status)
    if (Number.isInteger(code) && code < 500) s.good += r.requests
    by.set(r.route, s)
  }
  return [...by]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([route, s]) => ({
      route,
      total: s.total,
      good: s.good,
      ratio: s.total === 0 ? null : s.good / s.total,
      ok: s.total < MIN_REQUESTS ? null : s.good / s.total >= AVAILABILITY_GOAL,
    }))
}

export const hasAvailabilityBreach = (rows: RouteAvailability[]): boolean => rows.some((r) => r.ok === false)

export function availabilityMarkdown(rows: RouteAvailability[]): string {
  const body = rows.map(
    (r) =>
      `| \`${r.route}\` | ${String(r.good)} / ${String(r.total)} | ${r.ratio === null ? 'n/a' : `${(r.ratio * 100).toFixed(3)} %`} | ${r.ok === null ? `not judged (under ${String(MIN_REQUESTS)} requests)` : r.ok ? 'ok' : 'BREACH'} |`,
  )
  return [
    `Goal ${String(AVAILABILITY_GOAL * 100)} % of responses below 500 over ${String(WINDOW_DAYS)} days, per route.`,
    '',
    '| Route | Good / total | Availability | Result |',
    '| --- | --- | --- | --- |',
    ...body,
    '',
  ].join('\n')
}
