import { describe, expect, it } from 'vitest'
import {
  availabilityMarkdown,
  availabilitySql,
  evaluateAvailability,
  hasAvailabilityBreach,
  parseRows,
} from '../src/availability.ts'

const row = (route: string, status: string, requests: number) => ({ route, status, requests })

describe('availabilitySql', () => {
  it('reads the request points of the last 28 days, grouped by route and status', () => {
    const sql = availabilitySql('vaultme_api_staging')
    expect(sql).toContain("FROM vaultme_api_staging WHERE index1 = 'request'")
    expect(sql).toContain("INTERVAL '28' DAY")
    expect(sql).toContain('SUM(_sample_interval)')
    // blob order is fixed by apps/api/src/metrics.ts: blobs [route, String(status)]
    expect(sql).toContain('SELECT blob1 AS route, blob2 AS status,')
    expect(sql).toContain('AND timestamp > NOW()')
  })
  it('refuses a dataset name that is not a plain identifier', () => {
    expect(() => availabilitySql('x; DROP TABLE y')).toThrow(/bad dataset name/)
  })
})

describe('parseRows', () => {
  it('accepts numbers as numbers or as strings and rejects another shape', () => {
    expect(parseRows({ data: [{ route: '/v1/rpc', status: '200', requests: '12' }] })).toEqual([
      row('/v1/rpc', '200', 12),
    ])
    expect(() => parseRows({})).toThrow(/expected/)
    expect(() => parseRows({ data: [{ route: '/v1/rpc', status: '200' }] })).toThrow(/row 0/)
  })
})

describe('evaluateAvailability', () => {
  it('counts a status below 500 as good, including 401 and 429, and 5xx as bad', () => {
    const [r] = evaluateAvailability([row('/v1/rpc', '200', 900), row('/v1/rpc', '429', 90), row('/v1/rpc', '503', 10)])
    expect(r).toMatchObject({ total: 1000, good: 990, ratio: 0.99, ok: false })
  })
  it('holds at exactly 99.5 % and fails just under', () => {
    expect(evaluateAvailability([row('a', '200', 995), row('a', '500', 5)])[0]?.ok).toBe(true)
    expect(evaluateAvailability([row('a', '200', 994), row('a', '500', 6)])[0]?.ok).toBe(false)
  })
  it('does not judge a route with under 1,000 requests, however bad', () => {
    const r = evaluateAvailability([row('a', '200', 1), row('a', '500', 998)])
    expect(r[0]).toMatchObject({ total: 999, ok: null })
    expect(hasAvailabilityBreach(r)).toBe(false)
  })
  it('counts an unparsable status as bad and sorts routes by name', () => {
    const r = evaluateAvailability([row('b', '200', 1000), row('a', 'abc', 1000)])
    expect(r.map((x) => x.route)).toEqual(['a', 'b'])
    expect(r[0]?.ok).toBe(false)
  })
})

describe('availabilityMarkdown', () => {
  it('shows each route with its result', () => {
    const md = availabilityMarkdown(
      evaluateAvailability([row('/v1/rpc', '200', 990), row('/v1/rpc', '500', 10), row('/v1/health', '200', 5)]),
    )
    expect(md).toContain('| `/v1/rpc` | 990 / 1000 | 99.000 % | BREACH |')
    expect(md).toContain('| `/v1/health` | 5 / 5 | 100.000 % | not judged (under 1000 requests) |')
  })
})
