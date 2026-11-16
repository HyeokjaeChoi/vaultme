// Quota-safe load test of the staging API (ADR-0045, gate LOAD-1). Pure code, no Node and no k6 imports: `k6/load.js` imports it too.
import { OWN_P95_MS } from './slo.ts'

/** What the API promises on a 429 (apps/api/src/auth.ts `rateLimited`): the limiter period, and no reset time. */
export const RETRY_AFTER = '60'

export type Verdict = 'ok' | 'unavailable' | 'rate_limited' | 'unauthorized' | 'server_bug' | 'other'

/**
 * One response. `code` is the `code` of the JSON error body, or null when there is none. A 503 `unavailable` is an upstream that
 * is down (owner decision 9: it does not fail the run); any other 5xx is our bug. Status 0 is a request that never got an answer.
 */
export function classify(
  status: number,
  retryAfter: string | null | undefined,
  code: string | null,
): { verdict: Verdict; contract: boolean | null } {
  if (status === 200) return { verdict: 'ok', contract: null }
  if (status === 429)
    return {
      verdict: 'rate_limited',
      contract: retryAfter === RETRY_AFTER && code === 'rate_limited',
    }
  if (status === 401) return { verdict: 'unauthorized', contract: null }
  if (status === 503 && code === 'unavailable') return { verdict: 'unavailable', contract: null }
  if (status >= 500) return { verdict: 'server_bug', contract: null }
  return { verdict: 'other', contract: null }
}

/** A probe sends more than its limiter allows; the install probe uses a token, the IP probes none. */
export const PROBES = ['install', 'ip_rpc', 'ip_history'] as const
export type Probe = (typeof PROBES)[number]

export type Op = '==' | '<=' | '>'
export type Agg = 'count' | 'rate' | 'p(95)'
export type Check = {
  /** k6 metric (with its tag filter) the threshold sits on. */
  metric: string
  agg: Agg
  op: Op
  limit: number
  /** Stops the run at once: our bug, no reason to keep spending quota. */
  abort?: boolean
  /** What the evidence file calls it. */
  label: string
  unit: string
  /** k6 metric whose `count` is the number of samples behind the value. */
  samples: string
}

const probeHit = (kind: string) => `probe_hits{kind:${kind}}`
const probeSent = (p: Probe) => `probe_sent{probe:${p}}`
const probeLabel: Record<Probe, string> = {
  install: 'one install above its limit',
  ip_rpc: 'unauthenticated /v1/rpc above the IP limit',
  ip_history: 'unauthenticated /v1/history above the IP limit',
}

/** Every threshold of the run, in the order the summary lists them. The k6 thresholds and the evidence results both come from here. */
export const CHECKS: Check[] = [
  {
    metric: 'server_bug',
    agg: 'count',
    op: '==',
    limit: 0,
    abort: true,
    label: 'Server errors (5xx except 503 unavailable)',
    unit: 'responses',
    samples: 'http_reqs',
  },
  {
    metric: 'unexpected',
    agg: 'count',
    op: '==',
    limit: 0,
    label: 'Steady requests that were not 200 or 503 unavailable',
    unit: 'responses',
    samples: 'steady_requests',
  },
  {
    metric: 'limit_contract',
    agg: 'rate',
    op: '==',
    limit: 1,
    label: '429 responses with Retry-After 60 and code rate_limited',
    unit: 'ratio',
    samples: 'limit_contract_n',
  },
  ...PROBES.map((p): Check => ({
    metric: probeHit(`${p}_429`),
    agg: 'count',
    op: '>',
    limit: 0,
    label: `429 responses, ${probeLabel[p]}`,
    unit: 'responses',
    samples: probeSent(p),
  })),
  {
    // The limit is 60 per 60 s; Cloudflare limiters are per location and approximate (ARCHITECTURE.md), so 1.5 times.
    metric: probeHit('install_200'),
    agg: 'count',
    op: '<=',
    limit: 90,
    label: '200 responses, one install above its limit',
    unit: 'responses',
    samples: probeSent('install'),
  },
  ...(['ip_rpc', 'ip_history'] as const).map((p): Check => ({
    metric: probeHit(`${p}_2xx`),
    agg: 'count',
    op: '==',
    limit: 0,
    label: `2xx responses, ${probeLabel[p]} (no token)`,
    unit: 'responses',
    samples: probeSent(p),
  })),
  {
    metric: 'ok_own{scenario:steady}',
    agg: 'p(95)',
    op: '<=',
    limit: OWN_P95_MS,
    label: 'Own server time p95 under load (Worker time minus upstream time)',
    unit: 'ms',
    samples: 'own_n{scenario:steady}',
  },
  {
    metric: 'dropped_iterations',
    agg: 'count',
    op: '==',
    limit: 0,
    label: 'Dropped iterations (the rate was not delivered)',
    unit: 'iterations',
    samples: 'iterations',
  },
]

type K6Threshold = string | { threshold: string; abortOnFail: boolean; delayAbortEval: string }
/** The k6 threshold of a check, as k6 reads it. `abortOnFail` needs the long form. */
export const k6Threshold = (c: Check): K6Threshold => {
  const threshold = `${c.agg}${c.op}${String(c.limit)}`
  return c.abort ? { threshold, abortOnFail: true, delayAbortEval: '10s' } : threshold
}

/** k6 keeps a sub-metric only when a threshold names it: these are the ones the results read besides the checks. */
const READ_ONLY = ['own_n{scenario:steady}', ...PROBES.map(probeSent), 'steady_requests', 'unavailable_503']

/** All thresholds of `options`: the checks, the sample counters, and at least one own-time sample. */
export const thresholds = (): Record<string, K6Threshold[]> => ({
  ...Object.fromEntries(READ_ONLY.map((m) => [m, [m.startsWith('own_n') ? 'count>0' : 'count>=0']])),
  ...Object.fromEntries(CHECKS.map((c) => [c.metric, [k6Threshold(c)]])),
})

/** The `values` of the k6 metrics this test reads, by metric name: what `k6-load.json` holds. */
export type LoadSummary = {
  measuredAt: string
  values: Record<string, Record<string, number>>
}
type K6Data = {
  metrics: Record<string, { values: Record<string, number> } | undefined>
}

/** Pure: the k6 end-of-test data to the compact summary. A metric k6 did not report is left out. */
export function summarizeLoad(data: K6Data, measuredAt: string): LoadSummary {
  const names = new Set<string>([...CHECKS.flatMap((c) => [c.metric, c.samples]), ...READ_ONLY])
  const values: LoadSummary['values'] = {}
  for (const n of names) {
    const v = data.metrics[n]?.values
    if (v) values[n] = v
  }
  // The samples of a Rate are its passes and fails.
  const rate = data.metrics.limit_contract?.values
  if (rate) values.limit_contract_n = { count: (rate.passes ?? 0) + (rate.fails ?? 0) }
  return { measuredAt, values }
}

export type LoadResult = {
  metric: string
  value: number
  unit: string
  threshold: { op: Op; value: number } | null
  n: number
  window: string
}

const pick = (s: LoadSummary, metric: string, agg: Agg): number | undefined => {
  const v = s.values[metric]
  return v === undefined ? undefined : agg === 'rate' ? v.rate : agg === 'p(95)' ? v['p(95)'] : v.count
}

/**
 * The results of the run, one per threshold, plus the share of 503 `unavailable` (reported, no limit). Throws when a check has no
 * samples: a run that never measured it has no evidence for it.
 */
export function loadResults(s: LoadSummary): LoadResult[] {
  const window = 'one run'
  const results = CHECKS.map((c): LoadResult => {
    const n = s.values[c.samples]?.count ?? 0
    // k6 leaves out an empty counter or reports it as 0, and reports an empty trend as zeros: the sample count decides.
    if (n < 1) throw new Error(`${c.label}: no samples (${c.samples})`)
    const value = pick(s, c.metric, c.agg) ?? (c.agg === 'count' ? 0 : undefined)
    if (value === undefined) throw new Error(`${c.label}: k6 did not report ${c.metric}`)
    return {
      metric: c.label,
      value,
      unit: c.unit,
      threshold: { op: c.op, value: c.limit },
      n,
      window,
    }
  })
  const steady = s.values.steady_requests?.count ?? 0
  const unavailable = s.values.unavailable_503?.count ?? 0
  results.push({
    metric: 'Steady requests answered 503 unavailable (an upstream down; does not fail the run)',
    value: Math.round((unavailable / steady) * 1000) / 10,
    unit: '%',
    threshold: null,
    n: steady,
    window,
  })
  return results
}

const holds = (v: number, t: { op: Op; value: number }): boolean =>
  t.op === '==' ? v === t.value : t.op === '<=' ? v <= t.value : v > t.value

/** The job summary: every threshold with its value. */
export function loadMarkdown(results: LoadResult[]): string {
  const rows = results.map((r) => {
    const limit = r.threshold === null ? 'report only' : `\`${r.threshold.op} ${String(r.threshold.value)}\``
    const verdict = r.threshold === null ? 'report only' : holds(r.value, r.threshold) ? 'pass' : 'FAIL'
    return `| ${r.metric} | ${limit} | ${String(r.value)} ${r.unit} | ${String(r.n)} | ${verdict} |`
  })
  return ['| Metric | Threshold | Value | n | Result |', '| --- | --- | --- | --- | --- |', ...rows, ''].join('\n')
}
