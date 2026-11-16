// Usage (from the repo root, node 24):
//   node packages/perf/src/cli.ts hermes <expo export dir> <out.json>
//   STAGING_API_URL=... node --experimental-transform-types packages/perf/src/cli.ts latency <out.json>    (prints the table; CI adds it to the job summary)
//   STAGING_API_URL=... node --experimental-transform-types packages/perf/src/cli.ts smoke    (post-deploy: one balance read and one history read; exit 1 on failure)
//   node packages/perf/src/cli.ts bench --runs <dir with one subdir per api-bench run> --out docs/perf --commit <sha> --origin <text>    (adds the k6 CI numbers to baseline.json and baseline.md, prints the tier-2 limits for api.js)
//   node packages/perf/src/cli.ts slo-window --runs <dir with the downloaded api-bench artifacts of the window>    (pools the SLO counts, ADR-0036; exit 3 on a breach, so a crash (exit 1) is not one)
//   node packages/perf/src/cli.ts hermes-growth <current perf-hermes.json> <perf-hermes.json of main> [summary file]    (MOB-3: the change per platform to the summary file or stdout, a ::warning:: line on stdout above 100 KiB; exit 0 unless a file is unreadable)
//   node packages/perf/src/cli.ts ci-health [--repo <owner/name>] [--json <file>]    (OBS-1: the weekly CI health table from `gh`; exit 3 on a breach, so a crash (exit 1) is not one)
//   node packages/perf/src/cli.ts availability sql <dataset> | availability check <sql response.json>    (API-6: the Analytics Engine query, and the 99.5 % judgement of its answer; exit 3 on a breach)
//   node packages/perf/src/cli.ts ci-health [--repo <owner/name>]    (OBS-1: the weekly CI health table from `gh`; exit 3 on a breach, so a crash (exit 1) is not one)
//   node packages/perf/src/cli.ts evidence emit --gate <id> --origin <text> --tool <text> --out <file> (--from hermes=<file> | --from js-budget=<file> | --result '<json>' | --results <file>) [--measured-at <YYYY-MM-DDTHH:MM:SSZ>] [--run <id>]    (a gate job writes its evidence file; --run takes the run from `gh` instead of the Actions environment, to seed an old run)
//   node packages/perf/src/cli.ts evidence add <file>... [--out docs/results]    (puts evidence files under their canonical path and renders the README)
//   node packages/perf/src/cli.ts evidence collect --run <id>... [--out docs/results]    (downloads the evidence-* artifacts of runs, checks them against the run, adds them)
//   node packages/perf/src/cli.ts evidence render [--out docs/results]    (rewrites docs/results/README.md from the files; run it after a rebase, never merge the README by hand)
//   node packages/perf/src/cli.ts baseline --lhci-desktop <dir> --lhci-mobile <dir> --hermes <json> --api <json> --out docs/perf --commit <sha> --origin <text> [--measured-at <YYYY-MM-DD>]    (--measured-at: the day the artifacts were measured; default today)
import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { growthTable, growthWarnings, hermesGrowth } from './hermes-growth.ts'
import {
  availabilityMarkdown,
  availabilitySql,
  evaluateAvailability,
  hasAvailabilityBreach,
  parseRows,
} from './availability.ts'
import { ciHealthMarkdown, evaluate, hasBreach, isOff, type Dated, type Run } from './ci-health.ts'
import { aggregate, benchTable, limitsJs, MODES, type K6Result } from './bench.ts'
import { buildBaseline, latencyTable, renderBaseline, type Baseline, type JsBudgetRow } from './baseline.ts'
import {
  addEvidence,
  buildEvidence,
  checkAddable,
  checkProvenance,
  nowUtc,
  renderDir,
  runInfoFromEnv,
  runInfoFromGh,
  serialize,
  validateEvidence,
  type Evidence,
  type ResultInput,
} from './evidence.ts'
import { SOURCES } from './evidence-sources.ts'
import { sloWindow, windowMarkdown, type Case, type Mode, type SloCount } from './slo.ts'
import { hermesSizes, readLhrDir, type HermesSizes } from './summarize.ts'

// N per endpoint (ADR-0019): 20 + 20 + 5 calls plus 1 warm-up rpc and 1 token. The install limit is 60 per 60 s, the IP limit 300.
// History is 3 Etherscan calls per request against 2.5 calls/s, so 5 calls spaced 31 s apart use 15 calls in about 2 minutes.
const N = { health: 20, rpc: 20, history: 5 }
const HISTORY_GAP_MS = 31_000
// The public test vector address of the repo (apps/web/e2e/fixture-api.ts): a Sepolia address with real history, not a user.
const ADDRESS = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'

const readJson = (file: string): unknown => JSON.parse(readFileSync(file, 'utf8'))
const [cmd, ...rest] = process.argv.slice(2)

if (cmd === 'hermes') {
  const [dist, out] = rest
  if (!dist || !out) throw new Error('usage: hermes <expo export dir> <out.json>')
  writeFileSync(out, JSON.stringify(hermesSizes(dist)))
} else if (cmd === 'latency') {
  const [out] = rest
  const baseUrl = process.env.STAGING_API_URL
  if (!out || !baseUrl) throw new Error('usage: STAGING_API_URL=<url> latency <out.json>')
  const web = readJson(new URL('../../../apps/web/package.json', import.meta.url).pathname) as { version: string }
  // Imported here: @vaultme/api-client needs --experimental-transform-types (parameter properties), the other commands run on plain node.
  const { measureApi } = await import('./latency.ts')
  const api = await measureApi({
    baseUrl: baseUrl.replace(/\/+$/, ''),
    appVersion: web.version,
    n: N,
    address: ADDRESS,
    historyGapMs: HISTORY_GAP_MS,
  })
  writeFileSync(out, JSON.stringify({ ...api, address: ADDRESS, historyGapMs: HISTORY_GAP_MS }))
  console.log(latencyTable(api))
  // A run where an endpoint never answered is a failed run, not a baseline.
  if (Object.values(api).some((e) => e.ok === 0)) process.exitCode = 1
} else if (cmd === 'smoke') {
  const baseUrl = process.env.STAGING_API_URL
  if (!baseUrl) throw new Error('usage: STAGING_API_URL=<url> smoke')
  const web = readJson(new URL('../../../apps/web/package.json', import.meta.url).pathname) as { version: string }
  const { smokeApi } = await import('./smoke.ts')
  await smokeApi({ baseUrl: baseUrl.replace(/\/+$/, ''), appVersion: web.version })
  console.log('smoke ok: balance read and history read')
} else if (cmd === 'baseline') {
  const { values: v } = parseArgs({
    args: rest,
    options: {
      'lhci-desktop': { type: 'string' },
      'lhci-mobile': { type: 'string' },
      hermes: { type: 'string' },
      api: { type: 'string' },
      out: { type: 'string' },
      commit: { type: 'string' },
      origin: { type: 'string' },
      'measured-at': { type: 'string' },
    },
  })
  const [desktop, mobile, hermes, api, out, commit, origin] = [
    v['lhci-desktop'],
    v['lhci-mobile'],
    v.hermes,
    v.api,
    v.out,
    v.commit,
    v.origin,
  ]
  if (!desktop || !mobile || !hermes || !api || !out || !commit || !origin)
    throw new Error('baseline: all options are required')
  // The artifacts are often a day or more old: the day they were measured, not the day this command runs.
  const measuredAt = v['measured-at'] ?? new Date().toISOString().slice(0, 10)
  // A real day: 2026-02-31 matches the shape and rolls over to March.
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(measuredAt) ||
    Number.isNaN(Date.parse(measuredAt)) ||
    new Date(measuredAt).toISOString().slice(0, 10) !== measuredAt
  )
    throw new Error('baseline: --measured-at must be a real day, YYYY-MM-DD')
  const baseline: Baseline = buildBaseline({
    measuredAt,
    commit,
    origin,
    desktop: readLhrDir(desktop),
    mobile: readLhrDir(mobile),
    jsBudget: readJson(join(desktop, 'js-budget.json')) as JsBudgetRow[],
    hermes: readJson(hermes) as HermesSizes,
    api: readJson(api) as Baseline['api'],
  })
  // The k6 numbers come from `bench`, not from these inputs: keep them when the other numbers are replaced.
  const old = join(out, 'baseline.json')
  const apiBench = existsSync(old) ? (readJson(old) as Baseline).apiBench : undefined
  if (apiBench) baseline.apiBench = apiBench
  writeFileSync(join(out, 'baseline.json'), `${JSON.stringify(baseline, null, 2)}\n`)
  writeFileSync(join(out, 'baseline.md'), renderBaseline(baseline))
} else if (cmd === 'bench') {
  const { values: v } = parseArgs({
    args: rest,
    options: {
      runs: { type: 'string' },
      out: { type: 'string' },
      commit: { type: 'string' },
      origin: { type: 'string' },
    },
  })
  if (!v.runs || !v.out || !v.commit || !v.origin)
    throw new Error('bench: --runs, --out, --commit and --origin are required')
  const runsDir = v.runs
  const dirs = readdirSync(runsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
  const results = dirs.flatMap((d) =>
    MODES.map((m) => {
      const file = join(runsDir, d, `k6-api-${m}.json`)
      if (!existsSync(file)) throw new Error(`bench: run folder ${d} has no k6-api-${m}.json`)
      return readJson(file) as K6Result
    }),
  )
  const apiBench = {
    // The day of the newest run, from the k6 results, not the day this command runs.
    measuredAt: results.map((r) => r.measuredAt.slice(0, 10)).sort()[results.length - 1] ?? '',
    commit: v.commit,
    origin: v.origin,
    runs: dirs.length,
    results: aggregate(results),
  }
  const file = join(v.out, 'baseline.json')
  const baseline = { ...(readJson(file) as Baseline), apiBench }
  writeFileSync(file, `${JSON.stringify(baseline, null, 2)}\n`)
  writeFileSync(join(v.out, 'baseline.md'), renderBaseline(baseline))
  console.log(`${benchTable(apiBench.results)}\n\n${limitsJs(apiBench.results)}`)
} else if (cmd === 'slo-window') {
  const { values: v } = parseArgs({ args: rest, options: { runs: { type: 'string' } } })
  const runs = v.runs
  if (!runs) throw new Error('slo-window: --runs is required')
  // Every k6 result file at any depth (`gh run download` puts each run in its own folder).
  const files = (readdirSync(runs, { recursive: true }) as string[]).filter((f) =>
    /(^|\/)k6-api-(warm|cold)\.json$/.test(f),
  )
  const results = files.map(
    (f) =>
      readJson(join(runs, f)) as {
        mode: Mode
        endpoints: Partial<Record<Case, { slo?: SloCount | null }>>
      },
  )
  const rows = sloWindow(results)
  console.log(windowMarkdown(rows, new Set(files.map((f) => dirname(f))).size))
  // 3, not 1: Node exits 1 on an uncaught throw, and api-slo-window.yml must not report a crash as a breach.
  if (rows.some((r) => r.ok === false)) process.exitCode = 3
} else if (cmd === 'evidence') {
  const [sub = '', ...args] = rest
  const resultsDir = fileURLToPath(new URL('../../../docs/results', import.meta.url))
  const gh = (a: string[]) => execFileSync('gh', a, { encoding: 'utf8' })
  const ghRun = (id: string) =>
    runInfoFromGh(JSON.parse(gh(['run', 'view', id, '--json', 'databaseId,headSha,url,workflowName,event'])))
  if (sub === 'emit') {
    const { values: v } = parseArgs({
      args,
      options: {
        gate: { type: 'string' },
        origin: { type: 'string' },
        tool: { type: 'string' },
        out: { type: 'string' },
        from: { type: 'string', multiple: true },
        result: { type: 'string', multiple: true },
        results: { type: 'string' },
        'measured-at': { type: 'string' },
        run: { type: 'string' },
      },
    })
    if (!v.gate || !v.origin || !v.tool || !v.out)
      throw new Error('evidence emit: --gate, --origin, --tool and --out are required')
    const results: ResultInput[] = [
      ...(v.from ?? []).flatMap((s) => {
        const [kind = '', file = ''] = s.split('=')
        const source = SOURCES[kind]
        if (!source || !file) throw new Error(`evidence emit: --from <${Object.keys(SOURCES).join(' | ')}>=<file>`)
        return source(readJson(file))
      }),
      ...(v.result ?? []).map((s) => JSON.parse(s) as ResultInput),
      ...(v.results ? (readJson(v.results) as ResultInput[]) : []),
    ]
    const e = buildEvidence({
      ...(v.run ? ghRun(v.run) : runInfoFromEnv(process.env)),
      gate: v.gate,
      measuredAt: v['measured-at'] ?? nowUtc(),
      origin: v.origin,
      tool: v.tool,
      results,
    })
    writeFileSync(v.out, serialize(e))
    console.log(`evidence: ${e.gate}, ${String(e.results.length)} result(s), ${v.out}`)
  } else if (sub === 'add') {
    const { values: v, positionals } = parseArgs({ args, options: { out: { type: 'string' } }, allowPositionals: true })
    const dir = v.out ?? resultsDir
    // Check every file first: a bad one must not leave the others half written.
    const files = positionals.map((f) => ({ f, e: validateEvidence(readJson(f)) }))
    for (const { e } of files) checkAddable(dir, e)
    for (const { f, e } of files) console.log(`${addEvidence(dir, e)}: ${f}`)
    renderDir(dir)
  } else if (sub === 'collect') {
    const { values: v } = parseArgs({
      args,
      options: { run: { type: 'string', multiple: true }, out: { type: 'string' } },
    })
    if (!v.run?.length) throw new Error('evidence collect: --run <id> is required (repeatable)')
    const dir = v.out ?? resultsDir
    // Two phases: download and check every file of every run, then write, so a bad file leaves the folder as it was.
    const pending: Evidence[] = []
    const tmp = mkdtempSync(join(tmpdir(), 'evidence-'))
    try {
      for (const id of v.run) {
        const run = ghRun(id)
        const into = join(tmp, id)
        try {
          gh(['run', 'download', id, '--pattern', 'evidence-*', '--dir', into])
        } catch {
          throw new Error(
            `evidence collect: run ${id} has no evidence-* artifact (is it finished, and did a job upload evidence-<gate>?)`,
          )
        }
        const found = (readdirSync(into, { recursive: true }) as string[]).filter((f) => f.endsWith('.json'))
        if (found.length === 0) throw new Error(`evidence collect: run ${id} has no evidence-*.json file`)
        for (const f of found) {
          const e = validateEvidence(readJson(join(into, f)))
          // The artifact `evidence-<gate>` holds `evidence-<gate>.json`: a file under another name is not one a job made on purpose.
          if (!f.endsWith(`evidence-${e.gate}.json`))
            throw new Error(`evidence collect: ${f} of run ${id} holds the gate ${e.gate}`)
          checkProvenance(e, run)
          if (pending.some((p) => p.gate === e.gate && p.runId === e.runId))
            throw new Error(`evidence collect: run ${id} has two files for the gate ${e.gate}`)
          checkAddable(dir, e)
          pending.push(e)
        }
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
    for (const e of pending) console.log(`${addEvidence(dir, e)}: ${e.gate} (run ${String(e.runId)})`)
    renderDir(dir)
  } else if (sub === 'render') {
    const { values: v } = parseArgs({ args, options: { out: { type: 'string' } } })
    renderDir(v.out ?? resultsDir)
  } else {
    throw new Error('usage: cli.ts evidence emit | add | collect | render')
  }
} else if (cmd === 'hermes-growth') {
  const [current, base, summary] = rest
  if (!current || !base)
    throw new Error('usage: hermes-growth <current perf-hermes.json> <perf-hermes.json of main> [summary file]')
  const rows = hermesGrowth(readJson(current) as HermesSizes, readJson(base) as HermesSizes)
  // The table goes to the summary file when one is given, the warnings always to stdout, where GitHub reads them.
  if (summary) appendFileSync(summary, `${growthTable(rows)}\n`)
  else console.log(growthTable(rows))
  for (const w of growthWarnings(rows)) console.log(w)
} else if (cmd === 'availability') {
  // The workflow runs the SQL with curl (the token stays in the shell step) and gives the answer to `check`.
  const [sub, arg] = rest
  if (sub === 'sql' && arg) console.log(availabilitySql(arg))
  else if (sub === 'check' && arg) {
    const rows = evaluateAvailability(parseRows(readJson(arg)))
    console.log(availabilityMarkdown(rows))
    // 3, not 1: Node exits 1 on an uncaught throw, and the workflow must not report a crash as a breach.
    if (hasAvailabilityBreach(rows)) process.exitCode = 3
  } else throw new Error('usage: cli.ts availability sql <dataset> | availability check <sql response.json>')
} else if (cmd === 'ci-health') {
  const { values: v } = parseArgs({ args: rest, options: { repo: { type: 'string' }, json: { type: 'string' } } })
  const repo = v.repo ?? process.env.GITHUB_REPOSITORY
  if (!repo) throw new Error('ci-health: pass --repo <owner/name> or run inside GitHub Actions')
  const gh = (a: string[]): unknown =>
    JSON.parse(execFileSync('gh', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }))
  const since = new Date(Date.now() - 28 * 86_400_000).toISOString()
  const runs = (extra: string[]) =>
    gh([
      'run',
      'list',
      '--repo',
      repo,
      '--workflow',
      'ci.yml',
      '--limit',
      '1000',
      '--json',
      'databaseId,conclusion,createdAt,startedAt,updatedAt',
      ...extra,
    ]) as (Run & { databaseId: number; startedAt: string })[]
  // `startedAt`, not `createdAt`: a re-run attempt starts later, and the first attempt is not part of its time.
  const prRuns = runs(['--event', 'pull_request', '--status', 'success'])
    .slice(0, 10)
    .map((r) => ({ ...r, createdAt: r.startedAt }))
  const verifyMinutes = prRuns.flatMap((r) => {
    const jobs = gh(['api', `repos/${repo}/actions/runs/${String(r.databaseId)}/jobs?per_page=100`]) as {
      jobs: { name: string; started_at: string; completed_at: string | null }[]
    }
    const j = jobs.jobs.find((x) => x.name === 'verify')
    return j?.completed_at ? [(Date.parse(j.completed_at) - Date.parse(j.started_at)) / 60_000] : []
  })
  const workflows = (
    gh(['api', `repos/${repo}/actions/workflows?per_page=100`]) as { workflows: { name: string; state: string }[] }
  ).workflows
  const bench = gh([
    'run',
    'list',
    '--repo',
    repo,
    '--workflow',
    'api-bench.yml',
    '--status',
    'success',
    '--limit',
    '1',
    '--json',
    'createdAt',
  ]) as { createdAt: string }[]
  const dated = (a: string[]) => gh(a) as Dated[]
  const metrics = evaluate({
    now: new Date().toISOString(),
    mainRuns: runs(['--branch', 'main', '--event', 'push', '--status', 'completed', '--created', `>=${since}`]),
    prRuns,
    verifyMinutes,
    flaky: dated([
      'issue',
      'list',
      '--repo',
      repo,
      '--label',
      'flaky',
      '--state',
      'open',
      '--limit',
      '1000',
      '--json',
      'number,createdAt',
    ]),
    lastGreenBench: bench[0]?.createdAt ?? null,
    workflows,
    renovate: dated([
      'pr',
      'list',
      '--repo',
      repo,
      '--author',
      'app/renovate',
      '--state',
      'open',
      '--limit',
      '1000',
      '--json',
      'number,createdAt',
    ]),
    cacheBytes: (gh(['api', `repos/${repo}/actions/cache/usage`]) as { active_caches_size_in_bytes: number })
      .active_caches_size_in_bytes,
  })
  console.log(
    ciHealthMarkdown(
      metrics,
      workflows.filter(isOff).map((w) => w.name),
    ),
  )
  // The numbers for `evidence emit --from ci-health=<file>` (ADR-0043).
  if (v.json) writeFileSync(v.json, JSON.stringify(metrics))
  // 3, not 1: Node exits 1 on an uncaught throw, and ci-health.yml must not report a crash as a breach.
  if (hasBreach(metrics)) process.exitCode = 3
} else {
  throw new Error(
    'usage: cli.ts hermes | latency | smoke | baseline | bench | slo-window | ci-health | availability | hermes-growth | evidence',
  )
}
