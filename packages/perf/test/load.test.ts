import { describe, expect, it } from 'vitest'
import {
  CHECKS,
  classify,
  k6Threshold,
  loadMarkdown,
  loadResults,
  PROBES,
  summarizeLoad,
  thresholds,
  type LoadSummary,
} from '../src/load.ts'
import { OWN_P95_MS } from '../src/slo.ts'

describe('classify', () => {
  it.each([
    [200, null, null, 'ok', null],
    [429, '60', 'rate_limited', 'rate_limited', true],
    [429, null, 'rate_limited', 'rate_limited', false],
    [429, '10', 'rate_limited', 'rate_limited', false],
    [429, '60', 'internal', 'rate_limited', false],
    [401, null, 'unauthorized', 'unauthorized', null],
    [503, null, 'unavailable', 'unavailable', null],
    [503, null, null, 'server_bug', null],
    [500, null, 'internal', 'server_bug', null],
    [502, null, null, 'server_bug', null],
    [0, null, null, 'other', null],
    [403, null, 'method_not_allowed', 'other', null],
  ] as const)('%s retry-after %s code %s is %s (contract %s)', (status, retryAfter, code, verdict, contract) => {
    expect(classify(status, retryAfter, code)).toEqual({ verdict, contract })
  })
})

describe('thresholds', () => {
  it('has one threshold per check, and only the server-bug check aborts the run', () => {
    const t = thresholds()
    for (const c of CHECKS) expect(t[c.metric]).toBeDefined()
    expect(t.server_bug).toEqual([{ threshold: 'count==0', abortOnFail: true, delayAbortEval: '10s' }])
    expect(t['probe_hits{kind:install_429}']).toEqual(['count>0'])
    expect(t['probe_hits{kind:install_200}']).toEqual(['count<=90'])
    expect(t['probe_hits{kind:ip_rpc_2xx}']).toEqual(['count==0'])
    expect(t.limit_contract).toEqual(['rate==1'])
    expect(t['ok_own{scenario:steady}']).toEqual([`p(95)<=${String(OWN_P95_MS)}`])
    expect(t.dropped_iterations).toEqual(['count==0'])
    expect(CHECKS.filter((c) => c.abort).map((c) => c.metric)).toEqual(['server_bug'])
  })
  it('asks for at least one own-time sample, and counts what each probe sent', () => {
    const t = thresholds()
    expect(t['own_n{scenario:steady}']).toEqual(['count>0'])
    for (const p of PROBES) expect(t[`probe_sent{probe:${p}}`]).toEqual(['count>=0'])
  })
  it('reads a plain check as a string', () => {
    expect(CHECKS.filter((c) => c.metric === 'unexpected').map(k6Threshold)).toEqual(['count==0'])
  })
})

// What a good run looks like in the k6 end-of-test data.
const data = (over: Record<string, Record<string, number>> = {}) => ({
  metrics: Object.fromEntries(
    Object.entries({
      http_reqs: { count: 1386 },
      iterations: { count: 1380 },
      steady_requests: { count: 360 },
      unavailable_503: { count: 9 },
      server_bug: { count: 0 },
      unexpected: { count: 0 },
      limit_contract: { rate: 1, passes: 300, fails: 0 },
      'probe_hits{kind:install_429}': { count: 60 },
      'probe_hits{kind:install_200}': { count: 60 },
      'probe_hits{kind:ip_rpc_429}': { count: 150 },
      'probe_hits{kind:ip_rpc_2xx}': { count: 0 },
      'probe_hits{kind:ip_history_429}': { count: 150 },
      'probe_hits{kind:ip_history_2xx}': { count: 0 },
      'probe_sent{probe:install}': { count: 120 },
      'probe_sent{probe:ip_rpc}': { count: 450 },
      'probe_sent{probe:ip_history}': { count: 450 },
      'ok_own{scenario:steady}': { 'p(95)': 31.2, count: 351 },
      'own_n{scenario:steady}': { count: 351 },
      dropped_iterations: { count: 0 },
      ...over,
    }).map(([k, values]) => [k, { values }]),
  ),
})
const summary = (over: Record<string, Record<string, number>> = {}): LoadSummary =>
  summarizeLoad(data(over), '2026-11-16T05:11:09Z')

describe('summarizeLoad', () => {
  it('keeps the values of the metrics it reads and derives the samples of the contract rate', () => {
    const s = summary()
    expect(s.measuredAt).toBe('2026-11-16T05:11:09Z')
    expect(s.values.limit_contract_n).toEqual({ count: 300 })
    expect(s.values['probe_sent{probe:install}']).toEqual({ count: 120 })
    expect(Object.keys(s.values)).not.toContain('some_other_metric')
  })
  it('leaves out a metric k6 did not report', () => {
    const d = data()
    delete d.metrics.dropped_iterations
    expect(summarizeLoad(d, 'x').values.dropped_iterations).toBeUndefined()
  })
})

describe('loadResults', () => {
  it('gives one result per threshold with the number of samples behind it, and the 503 share without a limit', () => {
    const r = loadResults(summary())
    expect(r).toHaveLength(CHECKS.length + 1)
    expect(r.find((x) => x.metric.startsWith('Own server time'))).toEqual({
      metric: 'Own server time p95 under load (Worker time minus upstream time)',
      value: 31.2,
      unit: 'ms',
      threshold: { op: '<=', value: 50 },
      n: 351,
      window: 'one run',
    })
    expect(r.find((x) => x.metric.startsWith('429 responses, one install'))).toMatchObject({
      value: 60,
      n: 120,
      threshold: { op: '>', value: 0 },
    })
    expect(r.at(-1)).toEqual({
      metric: 'Steady requests answered 503 unavailable (an upstream down; does not fail the run)',
      value: 2.5,
      unit: '%',
      threshold: null,
      n: 360,
      window: 'one run',
    })
  })
  it('reads a counter k6 left out as 0 (a run with no dropped iteration has none)', () => {
    const d = data()
    delete d.metrics.dropped_iterations
    const r = loadResults(summarizeLoad(d, 'x'))
    expect(r.find((x) => x.metric.startsWith('Dropped'))).toMatchObject({
      value: 0,
      n: 1380,
    })
  })
  it('throws when a check has no samples: no evidence for a number that was not measured', () => {
    expect(() => loadResults(summary({ 'own_n{scenario:steady}': { count: 0 } }))).toThrow(
      /Own server time.*no samples/,
    )
    expect(() => loadResults(summary({ limit_contract: { rate: 0, passes: 0, fails: 0 } }))).toThrow(
      /429 responses with Retry-After.*no samples/,
    )
    expect(() => loadResults(summary({ 'probe_sent{probe:ip_rpc}': { count: 0 } }))).toThrow(
      /ip_rpc|unauthenticated \/v1\/rpc/,
    )
  })
  it('throws when k6 did not report a rate or a trend it needs', () => {
    const d = data()
    delete d.metrics['ok_own{scenario:steady}']
    expect(() => loadResults(summarizeLoad(d, 'x'))).toThrow(/k6 did not report ok_own/)
  })
})

describe('loadMarkdown', () => {
  it('lists every threshold with its value and verdict, and marks a miss FAIL', () => {
    const md = loadMarkdown(
      loadResults(
        summary({
          'ok_own{scenario:steady}': { 'p(95)': 61, count: 351 },
          server_bug: { count: 2 },
        }),
      ),
    )
    expect(md.split('\n')[0]).toBe('| Metric | Threshold | Value | n | Result |')
    expect(md).toContain('| Server errors (5xx except 503 unavailable) | `== 0` | 2 responses | 1386 | FAIL |')
    expect(md).toContain(
      '| Own server time p95 under load (Worker time minus upstream time) | `<= 50` | 61 ms | 351 | FAIL |',
    )
    expect(md).toContain('| report only | 2.5 % | 360 | report only |')
    expect(md.match(/pass/g)?.length).toBe(CHECKS.length - 2)
  })
})
