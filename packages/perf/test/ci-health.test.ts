import { describe, expect, it } from 'vitest'
import { ciHealthMarkdown, evaluate, hasBreach, LIMITS, median, type Input, type Run } from '../src/ci-health.ts'

const NOW = '2026-11-16T06:37:00Z'
const run = (conclusion: string, minutes = 8, createdAt = '2026-11-10T00:00:00Z'): Run => ({
  conclusion,
  createdAt,
  updatedAt: new Date(Date.parse(createdAt) + minutes * 60_000).toISOString(),
})
const good = (over: Partial<Input> = {}): Input => ({
  now: NOW,
  mainRuns: [...Array<Run>(49).fill(run('success')), run('failure')],
  prRuns: Array<Run>(10).fill(run('success', 8.3)),
  verifyMinutes: [4, 4.2, 4.4],
  flaky: [{ number: 1, createdAt: '2026-11-10T06:37:00Z' }],
  lastGreenBench: '2026-11-10T04:17:00Z',
  workflows: [
    { name: 'ci', state: 'active' },
    { name: 'api-bench', state: 'active' },
  ],
  renovate: [{ number: 2, createdAt: '2026-11-06T06:37:00Z' }],
  cacheBytes: 7.07 * 1024 ** 3,
  ...over,
})
const by = (i: Input, name: string) => evaluate(i).find((m) => m.name.startsWith(name))

describe('median', () => {
  it('takes the middle, or the mean of the two middle values', () => {
    expect(median([])).toBeNull()
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
  })
})

describe('evaluate', () => {
  it('passes a healthy week and reports every metric with its sample count', () => {
    const ms = evaluate(good())
    expect(ms).toHaveLength(8)
    expect(hasBreach(ms)).toBe(false)
    expect(by(good(), 'Red main')).toMatchObject({ value: 2, n: 50, breach: false })
    expect(by(good(), 'PR CI')).toMatchObject({ value: 8.3, n: 10, breach: false })
    expect(by(good(), 'Oldest open `flaky`')).toMatchObject({ value: 6, n: 1, breach: false })
    expect(by(good(), 'Actions cache')).toMatchObject({ value: 7.07, unit: 'GiB' })
  })
  it('breaches just above each limit and not at it', () => {
    const red = (failed: number) =>
      by(
        good({
          mainRuns: [...Array<Run>(100 - failed).fill(run('success')), ...Array<Run>(failed).fill(run('failure'))],
        }),
        'Red main',
      )
    expect(red(2)?.breach).toBe(false)
    expect(red(3)?.breach).toBe(true)
    const wall = (m: number) => by(good({ prRuns: [run('success', m)] }), 'PR CI')
    expect(wall(LIMITS.prWallMinutes)?.breach).toBe(false)
    expect(wall(13)?.breach).toBe(true)
    expect(by(good({ verifyMinutes: [7] }), '`verify`')?.breach).toBe(true)
    expect(by(good({ cacheBytes: 9.5 * 1024 ** 3 }), 'Actions cache')?.breach).toBe(true)
  })
  it('judges the oldest flaky issue and the oldest Renovate pull request by age', () => {
    expect(
      by(good({ flaky: [{ number: 1, createdAt: '2026-10-30T00:00:00Z' }] }), 'Oldest open `flaky`'),
    ).toMatchObject({ value: 17.3, breach: true })
    expect(
      by(good({ renovate: [{ number: 2, createdAt: '2026-10-31T00:00:00Z' }] }), 'Oldest open Renovate')?.breach,
    ).toBe(true)
    expect(by(good({ flaky: [], renovate: [] }), 'Oldest open `flaky`')).toMatchObject({
      value: 0,
      n: 0,
      breach: false,
    })
  })
  it('treats no green api-bench as the worst case, and an old one as a breach', () => {
    expect(by(good({ lastGreenBench: null }), 'Age of the last green')).toMatchObject({ n: 0, breach: true })
    expect(by(good({ lastGreenBench: '2026-11-07T00:00:00Z' }), 'Age of the last green')).toMatchObject({
      value: 9.3,
      breach: true,
    })
  })
  it('breaches on any workflow that is not active', () => {
    const m = by(
      good({
        workflows: [
          { name: 'api-bench', state: 'disabled_inactivity' },
          { name: 'ci', state: 'active' },
        ],
      }),
      'Workflows',
    )
    expect(m).toMatchObject({ value: 1, n: 2, breach: true })
  })
  it('judges the exact value, not the rounded one, and counts timeouts and startup failures as red', () => {
    const renovate = [{ number: 2, createdAt: '2026-11-02T06:00:00Z' }]
    expect(by(good({ renovate }), 'Oldest open Renovate')).toMatchObject({ value: 14, breach: true })
    const runs = [...Array<Run>(97).fill(run('success')), run('timed_out'), run('startup_failure'), run('failure')]
    expect(by(good({ mainRuns: runs }), 'Red main')).toMatchObject({ value: 3, breach: true })
  })
  it('does not count a deleted workflow, and counts a manually disabled one', () => {
    const w = (state: string) => by(good({ workflows: [{ name: 'x', state }] }), 'Workflows')
    expect(w('deleted')?.breach).toBe(false)
    expect(w('disabled_manually')?.breach).toBe(true)
  })
  it('leaves out the rates and medians that have no sample, and ignores cancelled runs', () => {
    const names = evaluate(good({ mainRuns: [run('cancelled')], prRuns: [], verifyMinutes: [] })).map((m) => m.name)
    expect(names.some((n) => n.startsWith('Red main'))).toBe(false)
    expect(names.some((n) => n.startsWith('PR CI'))).toBe(false)
    expect(names.some((n) => n.startsWith('`verify`'))).toBe(false)
  })
})

describe('ciHealthMarkdown', () => {
  it('lists every metric with its verdict and the workflows that are not active', () => {
    const md = ciHealthMarkdown(evaluate(good({ cacheBytes: 10 * 1024 ** 3 })), ['api-bench'])
    expect(md.split('\n')[0]).toBe('| Metric | Value | Limit | n | Result |')
    expect(md).toContain('| Actions cache size | 10 GiB | `<= 9` | 1 | BREACH |')
    expect(md).toContain('Not active: api-bench.')
  })
})
