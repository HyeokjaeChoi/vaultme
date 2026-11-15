import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import {
  addEvidence,
  buildEvidence,
  checkAddable,
  checkProvenance,
  checkResults,
  evidenceFileName,
  holds,
  loadResults,
  nowUtc,
  OPS,
  renderDir,
  renderReadme,
  runInfoFromEnv,
  runInfoFromGh,
  serialize,
  validateEvidence,
  type Evidence,
  type EvidenceInput,
  type Op,
} from '../src/evidence.ts'
import { chain3Results, chain5Results, hermesResults, jsBudgetResults, SOURCES } from '../src/evidence-sources.ts'

const RUN = {
  commit: 'a'.repeat(40),
  runId: 4242,
  runUrl: 'https://github.com/owner/repo/actions/runs/4242',
  workflow: 'api-load',
  event: 'workflow_dispatch',
}
const input = (over: Partial<EvidenceInput> = {}): EvidenceInput => ({
  ...RUN,
  gate: 'LOAD-1',
  measuredAt: '2026-11-16T05:11:09Z',
  origin: 'GitHub ubuntu-latest, staging API',
  tool: 'k6@2.3.0',
  results: [
    { metric: 'own time p95', value: 31.2, unit: 'ms', threshold: { op: '<=', value: 50 }, n: 360, window: 'one run' },
    {
      metric: 'server errors',
      value: 0,
      unit: 'responses',
      threshold: { op: '==', value: 0 },
      n: 1386,
      window: 'one run',
    },
    { metric: '503 share', value: 0.4, unit: '%', threshold: null, n: 360, window: 'one run' },
  ],
  ...over,
})
const ev = (over: Partial<EvidenceInput> = {}) => buildEvidence(input(over))

describe('holds', () => {
  it('compares at the boundary for every operator', () => {
    // Per operator: the value 5, 4 and 6 against the limit 5, as 1 (holds) or 0.
    const row = (op: Op) => [5, 4, 6].map((v) => (holds(v, { op, value: 5 }) ? 1 : 0)).join('')
    expect(OPS.map(row)).toEqual(['010', '110', '001', '101', '100'])
  })
})

describe('buildEvidence', () => {
  it('computes pass from the threshold: a producer cannot type in a verdict', () => {
    const e = ev({
      results: [
        { metric: 'a', value: 51, unit: 'ms', threshold: { op: '<=', value: 50 }, n: 1, window: 'one run' },
        { metric: 'b', value: 1, unit: 'ms', threshold: null, n: 1, window: 'one run' },
      ],
    })
    expect(e.results.map((r) => r.pass)).toEqual([false, null])
  })
  it('names the missing or wrong threshold key instead of a type error', () => {
    const bad = (threshold: unknown) =>
      buildEvidence(
        input({ results: [{ metric: 'm', value: 1, unit: 'ms', threshold, n: 1, window: 'one run' } as never] }),
      )
    expect(() => bad('50')).toThrow(/threshold: expected an object/)
    const noKey = { metric: 'm', value: 1, unit: 'ms', n: 1, window: 'one run' }
    expect(() => buildEvidence(input({ results: [noKey as never] }))).toThrow(/missing key "threshold"/)
  })
  it('rejects angle brackets in text (HTML in a table cell)', () => {
    expect(() => ev({ origin: 'runner <details>' })).toThrow(/origin: expected 1 to 200 characters/)
  })
  it('writes the keys in one fixed order and the file ends with a newline', () => {
    const e = ev()
    expect(Object.keys(e)).toEqual([
      'schema',
      'gate',
      'commit',
      'runId',
      'runUrl',
      'workflow',
      'event',
      'measuredAt',
      'origin',
      'tool',
      'results',
    ])
    expect(serialize(e).endsWith('}\n')).toBe(true)
    expect(validateEvidence(JSON.parse(serialize(e)))).toEqual(e)
  })
  it('names the file by day, short commit and run id, so two runs never collide', () => {
    expect(evidenceFileName(ev())).toBe('2026-11-16-aaaaaaa-4242.json')
  })
  it('nowUtc has the shape the schema wants', () => {
    expect(() => ev({ measuredAt: nowUtc() })).not.toThrow()
  })
})

describe('validateEvidence', () => {
  const valid = (): Record<string, unknown> => JSON.parse(serialize(ev())) as Record<string, unknown>
  const result0 = (o: Record<string, unknown>) => (o.results as Record<string, unknown>[])[0]!
  const cases: [string, (o: Record<string, unknown>) => void, RegExp][] = [
    ['an unknown key', (o) => (o.extra = 1), /unknown key "extra"/],
    ['a missing key', (o) => delete o.tool, /missing key "tool"/],
    ['another schema number', (o) => (o.schema = 2), /schema/],
    ['a gate with a space', (o) => (o.gate = 'LOAD 1'), /gate/],
    ['a gate with a pipe', (o) => (o.gate = 'LOAD|1'), /gate/],
    ['a short commit', (o) => (o.commit = 'abc1234'), /commit/],
    ['a run URL of another run', (o) => (o.runUrl = 'https://github.com/owner/repo/actions/runs/1'), /runUrl/],
    ['a run URL off GitHub', (o) => (o.runUrl = 'https://example.com/owner/repo/actions/runs/4242'), /runUrl/],
    ['run id 0', (o) => (o.runId = 0), /runId/],
    ['a time that is not UTC', (o) => (o.measuredAt = '2026-11-16T05:11:09+09:00'), /measuredAt/],
    ['a day that does not exist', (o) => (o.measuredAt = '2026-02-30T00:00:00Z'), /measuredAt/],
    ['no results', (o) => (o.results = []), /non-empty/],
    ['the same metric twice', (o) => (o.results as unknown[]).push(result0(o)), /twice/],
    ['a pass that disagrees with the number', (o) => (result0(o).pass = false), /results\[0\]\.pass: must be true/],
    [
      'a pass without a threshold',
      (o) => ((o.results as Record<string, unknown>[])[2]!.pass = true),
      /results\[2\]\.pass: must be null/,
    ],
    ['0 samples', (o) => (result0(o).n = 0), /results\[0\]\.n/],
    ['a value that is not finite', (o) => (result0(o).value = Number.NaN), /results\[0\]\.value/],
    ['an unknown operator', (o) => (result0(o).threshold = { op: '=>', value: 1 }), /op/],
    ['a unit with a pipe', (o) => (result0(o).unit = 'a|b'), /results\[0\]\.unit/],
    ['a metric with a line break', (o) => (result0(o).metric = 'a\nb'), /results\[0\]\.metric/],
    ['an origin with spaces at the end', (o) => (o.origin = 'x '), /origin/],
  ]
  it.each(cases)('rejects %s', (_name, mutate, message) => {
    const o = valid()
    mutate(o)
    expect(() => validateEvidence(o)).toThrow(message)
  })
  it.each([null, [], 'text', 3])('rejects %j as a whole', (x) => {
    expect(() => validateEvidence(x)).toThrow(/expected an object/)
  })
})

describe('run info', () => {
  const env = {
    GITHUB_RUN_ID: '4242',
    GITHUB_SHA: 'a'.repeat(40),
    GITHUB_SERVER_URL: 'https://github.com',
    GITHUB_REPOSITORY: 'owner/repo',
    GITHUB_WORKFLOW: 'api-load',
    GITHUB_EVENT_NAME: 'workflow_dispatch',
  }
  it('reads the run from the Actions environment', () => {
    expect(runInfoFromEnv(env)).toEqual(RUN)
  })
  it('names the missing variable', () => {
    expect(() => runInfoFromEnv({ ...env, GITHUB_SHA: undefined })).toThrow(/GITHUB_SHA is not set/)
    expect(() => runInfoFromEnv({ ...env, GITHUB_RUN_ID: '' })).toThrow(/GITHUB_RUN_ID is not set/)
  })
  const gh = {
    databaseId: 4242,
    headSha: 'a'.repeat(40),
    url: RUN.runUrl,
    workflowName: 'api-load',
    event: 'workflow_dispatch',
  }
  it('reads the run from `gh run view --json`', () => {
    expect(runInfoFromGh(gh)).toEqual(RUN)
  })
  it('rejects a gh answer of another shape', () => {
    expect(() => runInfoFromGh({ ...gh, headSha: 7 })).toThrow(/headSha is not a string/)
    expect(() => runInfoFromGh({ ...gh, extra: 1 })).toThrow(/unknown key/)
  })
  it('checkProvenance accepts a file that says what GitHub says', () => {
    expect(() => checkProvenance(ev(), RUN)).not.toThrow()
  })
  it.each([
    ['run id', { runId: 1 }],
    ['run URL', { runUrl: 'https://github.com/owner/repo/actions/runs/1' }],
    ['workflow', { workflow: 'other' }],
    ['event', { event: 'schedule' }],
    ['commit', { commit: 'b'.repeat(40) }],
  ])('checkProvenance rejects another %s', (_name, over) => {
    expect(() => checkProvenance(ev(), { ...RUN, ...over })).toThrow(/in the file and/)
  })
  it('checkProvenance leaves the commit of a pull request run alone (the file holds the merge commit)', () => {
    const pr = { ...RUN, event: 'pull_request' }
    expect(() => checkProvenance(ev({ event: 'pull_request' }), { ...pr, commit: 'b'.repeat(40) })).not.toThrow()
  })
})

describe('renderReadme', () => {
  const file = (e: Evidence) => ({ gate: e.gate, name: evidenceFileName(e), evidence: e })
  const old = ev({
    runId: 1,
    runUrl: 'https://github.com/owner/repo/actions/runs/1',
    measuredAt: '2026-11-09T05:00:00Z',
  })
  const fresh = ev()
  const big = ev({
    gate: 'js-budget',
    workflow: 'ci',
    event: 'push',
    results: [
      {
        metric: 'JS gzip, /address',
        value: 153011,
        unit: 'B',
        threshold: { op: '<=', value: 153600 },
        n: 1,
        window: 'one build',
      },
      {
        metric: 'JS gzip, /tx',
        value: 153700,
        unit: 'B',
        threshold: { op: '<=', value: 153600 },
        n: 1,
        window: 'one build',
      },
    ],
  })
  const ten = ev({ gate: 'LOAD-10' })
  const two = ev({ gate: 'LOAD-2' })
  const md = renderReadme([file(old), file(fresh), file(big), file(ten), file(two)])
  it('shows the newest file of each gate, one row per metric, and counts all files', () => {
    expect(md).toContain(
      '| [LOAD-1](LOAD-1/) | own time p95 | `<= 50 ms` | 31.2 ms | pass | 2026-11-16 | api-load (workflow_dispatch) |',
    )
    expect(md).not.toContain('2026-11-09')
    expect(md).toContain('Files: 5. Gates: 4.')
  })
  it('groups thousands, marks a miss FAIL and a number without a limit report only', () => {
    expect(md).toContain('| JS gzip, /address | `<= 153,600 B` | 153,011 B | pass |')
    expect(md).toContain('| JS gzip, /tx | `<= 153,600 B` | 153,700 B | FAIL |')
    expect(md).toContain('| 503 share | report only | 0.4 % | report only |')
  })
  it('links the commit, the run and the file', () => {
    expect(md).toContain(
      `[aaaaaaa](https://github.com/owner/repo/commit/${'a'.repeat(40)}) | [4242](${RUN.runUrl}) | [\`docs/results/LOAD-1/2026-11-16-aaaaaaa-4242.json\`](LOAD-1/2026-11-16-aaaaaaa-4242.json)`,
    )
  })
  it('sorts gates by name with numbers as numbers, and does not depend on the order of the input', () => {
    const names = [...md.matchAll(/^\| \[([^\]]+)\]\(/gm)].map((m) => m[1])
    expect(names).toEqual([
      ...Array<string>(2).fill('js-budget'),
      ...Array<string>(3).fill('LOAD-1'),
      ...Array<string>(3).fill('LOAD-2'),
      ...Array<string>(3).fill('LOAD-10'),
    ])
    expect(renderReadme([file(two), file(ten), file(big), file(fresh), file(old)])).toBe(md)
  })
  it('breaks a tie of the time with the higher run id', () => {
    const a = ev({ runId: 7, runUrl: 'https://github.com/owner/repo/actions/runs/7' })
    expect(renderReadme([file(a), file(fresh)])).toContain('[4242]')
    expect(renderReadme([file(fresh), file(a)])).toContain('[4242]')
  })
})

describe('a results folder', () => {
  const dirs: string[] = []
  const folder = (...inputs: EvidenceInput[]) => {
    const dir = mkdtempSync(join(tmpdir(), 'evidence-test-'))
    dirs.push(dir)
    for (const i of inputs) addEvidence(dir, buildEvidence(i))
    renderDir(dir)
    return dir
  }
  afterEach(() => {
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
  })

  it('passes when the README is the render of the files', () => {
    expect(checkResults(folder(input(), input({ gate: 'js-budget', workflow: 'ci' })))).toEqual([])
  })
  it('fails when a number of the README is edited by hand, and names the line', () => {
    const dir = folder(input())
    const readme = join(dir, 'README.md')
    writeFileSync(readme, readFileSync(readme, 'utf8').replace('31.2 ms', '13.2 ms'))
    const problems = checkResults(dir)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/^README\.md:\d+: expected ".*31\.2 ms.*", found ".*13\.2 ms.*"$/)
  })
  it('fails when a file was added and the README was not rendered again', () => {
    const dir = folder(input())
    addEvidence(dir, buildEvidence(input({ gate: 'LOAD-2' })))
    expect(checkResults(dir)[0]).toMatch(/^README\.md:\d+: expected ".*LOAD-2/)
  })
  it('fails when the README is missing', () => {
    const dir = folder(input())
    rmSync(join(dir, 'README.md'))
    expect(checkResults(dir)).toEqual(['README.md: missing (run `evidence render`)'])
  })
  it('fails on a README with a line too many', () => {
    const dir = folder(input())
    const readme = join(dir, 'README.md')
    writeFileSync(readme, `${readFileSync(readme, 'utf8')}extra line\n`)
    expect(checkResults(dir)[0]).toMatch(/found "extra line"/)
  })
  it('fails on a file that breaks the schema, is named wrongly, or sits in another gate folder', () => {
    const dir = folder(input())
    const body = serialize(ev())
    writeFileSync(join(dir, 'LOAD-1', 'wrong-name.json'), body)
    mkdirSync(join(dir, 'other'))
    writeFileSync(join(dir, 'other', evidenceFileName(ev())), body)
    writeFileSync(join(dir, 'LOAD-1', '2026-11-17-aaaaaaa-4242.json'), body.replace('"schema": 1', '"schema": 2'))
    writeFileSync(join(dir, 'LOAD-1', 'not-json.json'), '{')
    writeFileSync(join(dir, 'notes.txt'), 'x')
    const problems = checkResults(dir).join('\n')
    expect(problems).toContain('LOAD-1/wrong-name.json: the file must be named 2026-11-16-aaaaaaa-4242.json')
    expect(problems).toContain('other/2026-11-16-aaaaaaa-4242.json: gate is LOAD-1 but the folder is other')
    expect(problems).toContain('LOAD-1/2026-11-17-aaaaaaa-4242.json: schema: expected 1')
    expect(problems).toContain('LOAD-1/not-json.json: ')
    expect(problems).toContain('notes.txt: only README.md and one folder per gate belong here')
  })
  it('keeps a file as it is: the same file again is a no-op, another content under the same name throws', () => {
    const dir = folder(input())
    expect(addEvidence(dir, ev())).toBe('same')
    const other = ev({ results: [{ metric: 'x', value: 1, unit: 'ms', threshold: null, n: 1, window: 'one run' }] })
    expect(() => addEvidence(dir, other)).toThrow(/never edited/)
  })
  it('fails on a file whose bytes are not the canonical form, even when its numbers are valid', () => {
    const dir = folder(input())
    const path = join(dir, 'LOAD-1', evidenceFileName(ev()))
    writeFileSync(path, JSON.stringify(JSON.parse(readFileSync(path, 'utf8'))))
    expect(checkResults(dir).join('\n')).toContain('the bytes are not the canonical form')
  })
  it('ignores dot files, and reports two gate folders that differ only in case', () => {
    const dir = folder(input())
    writeFileSync(join(dir, '.DS_Store'), 'x')
    writeFileSync(join(dir, 'LOAD-1', '.DS_Store'), 'x')
    expect(checkResults(dir)).toEqual([])
    try {
      mkdirSync(join(dir, 'load-1'))
    } catch {
      return // A case-insensitive disk (macOS) cannot hold both folders: the problem cannot arise there, and CI on Linux runs this.
    }
    expect(checkResults(dir).join('\n')).toContain('load-1: the same gate as LOAD-1 when the case is ignored')
  })
  it('refuses a second file of the same gate and run (a re-run attempt or a matrix leg), and checks before it writes', () => {
    const dir = folder(input())
    const again = ev({ measuredAt: '2026-11-17T06:00:00Z' })
    expect(() => checkAddable(dir, again)).toThrow(
      /run 4242 already has 2026-11-16-aaaaaaa-4242\.json; one file per gate and run/,
    )
    expect(() => addEvidence(dir, again)).toThrow(/one file per gate and run/)
    // Another gate of the same run is fine.
    expect(checkAddable(dir, ev({ gate: 'LOAD-2' }))).toBe('new')
    // A run id that only ends in the same digits is another run.
    expect(checkAddable(dir, ev({ runId: 14242, runUrl: 'https://github.com/owner/repo/actions/runs/14242' }))).toBe(
      'new',
    )
  })
  it('does not render over a broken file', () => {
    const dir = folder(input())
    writeFileSync(join(dir, 'LOAD-1', 'not-json.json'), '{')
    expect(() => renderDir(dir)).toThrow(/fix these files first:\nLOAD-1\/not-json\.json/)
    expect(loadResults(dir).files).toHaveLength(1)
  })
})

describe('docs/results of this repository', () => {
  const root = fileURLToPath(new URL('../../..', import.meta.url))
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' })
  // Without origin/main (a clone without it) the check cannot run; CI (`verify`, fetch-depth 0) always has it.
  const base = (() => {
    try {
      return git('merge-base', 'origin/main', 'HEAD').trim()
    } catch {
      return ''
    }
  })()
  it.skipIf(base === '')(
    'does not edit or rename a file that is on origin/main (ADR-0043: evidence is never edited)',
    () => {
      const changed = git('diff', '--name-status', '--find-renames', base, '--', 'docs/results')
        .split('\n')
        .filter((l) => /^[MRT]/.test(l) && /\.json(\s|$)/.test(l))
      expect(changed).toEqual([])
    },
  )
  it('is consistent: every file passes the schema and README.md is the render of the files', () => {
    expect(checkResults(fileURLToPath(new URL('../../../docs/results', import.meta.url)))).toEqual([])
  })
})

const vitestReport = (failed: number, total = 9, start = 1000, end = 13_400) => ({
  numTotalTests: total,
  numFailedTests: failed,
  startTime: start,
  testResults: [{ endTime: end - 2000 }, { endTime: end }],
})

describe('chain sources', () => {
  it('reads cases, fails and suite seconds of the anvil report against 9, 0 and 60 s', () => {
    const r = chain3Results(vitestReport(0))
    expect(r.map((x) => [x.value, x.threshold])).toEqual([
      [9, { op: '==', value: 9 }],
      [0, { op: '==', value: 0 }],
      [12.4, { op: '<=', value: 60 }],
    ])
    expect(buildEvidence(input({ gate: 'CHAIN-3', results: r })).results.every((x) => x.pass)).toBe(true)
    expect(
      buildEvidence(input({ gate: 'CHAIN-3', results: chain3Results(vitestReport(1, 8)) })).results.map((x) => x.pass),
    ).toEqual([false, false, true])
  })
  it('counts failed property tests as counterexamples', () => {
    const r = chain5Results(vitestReport(2, 15))
    expect(r.map((x) => x.value)).toEqual([15, 2])
    expect(r[1]?.threshold).toEqual({ op: '==', value: 0 })
  })
  it('throws on a report with no test or no times: nothing was measured', () => {
    expect(() => chain3Results(vitestReport(0, 0))).toThrow(/no test/)
    expect(() => chain5Results({ numTotalTests: 3, numFailedTests: 0 })).toThrow(/startTime/)
    expect(() => chain3Results({})).toThrow(/vitest json/)
  })
})

describe('sources', () => {
  it('turns perf-hermes.json into one result per platform against the 11 MiB limit', () => {
    expect(hermesResults({ ios: 10_236_843, android: 10_227_578 })).toEqual([
      {
        metric: 'Hermes bundle, ios',
        value: 10_236_843,
        unit: 'B',
        threshold: { op: '<=', value: 11_534_336 },
        n: 1,
        window: 'one build',
      },
      {
        metric: 'Hermes bundle, android',
        value: 10_227_578,
        unit: 'B',
        threshold: { op: '<=', value: 11_534_336 },
        n: 1,
        window: 'one build',
      },
    ])
  })
  it('turns js-budget.json into one result per page against its own limit', () => {
    const rows = [
      { url: 'http://localhost:8799/en/address', bytes: 153_011, limit: 153_600, files: 9 },
      { url: 'http://localhost:8799/', bytes: 0, limit: 102_400, files: 0 },
    ]
    expect(jsBudgetResults(rows)).toEqual([
      {
        metric: 'JS gzip, /en/address',
        value: 153_011,
        unit: 'B',
        threshold: { op: '<=', value: 153_600 },
        n: 1,
        window: 'one build',
      },
      { metric: 'JS gzip, /', value: 0, unit: 'B', threshold: { op: '<=', value: 102_400 }, n: 1, window: 'one build' },
    ])
  })
  it('rejects a file of another shape', () => {
    expect(() => hermesResults(null)).toThrow(/expected/)
    expect(() => hermesResults({ ios: 1 })).toThrow(/android is not a number/)
    expect(() => jsBudgetResults([])).toThrow(/expected a list/)
    expect(() => jsBudgetResults([{ url: 'http://x/', bytes: '1', limit: 2 }])).toThrow(
      /row 0 needs url, bytes and limit/,
    )
  })
  it('lists the kinds `evidence emit --from` accepts', () => {
    expect(Object.keys(SOURCES)).toEqual(['hermes', 'chain-3', 'chain-5', 'js-budget'])
  })
})
