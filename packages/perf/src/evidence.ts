// Measured results as committed evidence files (ADR-0043, gate EVID-1). Node built-ins only, so
// `node packages/perf/src/cli.ts evidence ...` runs without `pnpm install`, like `slo-window` in api-slo-window.yml.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const OPS = ['<', '<=', '>', '>=', '=='] as const
export type Op = (typeof OPS)[number]
export type Threshold = { op: Op; value: number }
export type Result = {
  /** What was measured. Unique within a file. */
  metric: string
  value: number
  unit: string
  /** The gate's limit, or null for a number that is only reported. */
  threshold: Threshold | null
  /** `value` against `threshold`; null without a threshold. Computed, never typed in. */
  pass: boolean | null
  /** Samples behind the value. */
  n: number
  /** The period the samples cover, for example `one run` or `28 days`. */
  window: string
}
/** One gate run: the file `evidence-<gate>.json` of a job, and later `docs/results/<gate>/<date>-<sha7>-<runId>.json`. */
export type Evidence = {
  schema: 1
  gate: string
  /** Full SHA of the commit the run measured. */
  commit: string
  runId: number
  runUrl: string
  workflow: string
  /** The GitHub event of the run (`schedule`, `push`, `workflow_dispatch`, ...): where it ran. */
  event: string
  /** `YYYY-MM-DDTHH:MM:SSZ`. */
  measuredAt: string
  origin: string
  tool: string
  results: Result[]
}
export type ResultInput = Omit<Result, 'pass'>
export type RunInfo = Pick<Evidence, 'commit' | 'runId' | 'runUrl' | 'workflow' | 'event'>
export type EvidenceInput = RunInfo &
  Pick<Evidence, 'gate' | 'measuredAt' | 'origin' | 'tool'> & { results: ResultInput[] }
export type EvidenceFile = { gate: string; name: string; evidence: Evidence }

/** `value op limit`. */
export function holds(value: number, t: Threshold): boolean {
  switch (t.op) {
    case '<':
      return value < t.value
    case '<=':
      return value <= t.value
    case '>':
      return value > t.value
    case '>=':
      return value >= t.value
    case '==':
      return value === t.value
  }
}

type Obj = Record<string, unknown>
export const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x)

function obj(x: unknown, at: string, keys: readonly string[]): Obj {
  if (!isObj(x)) throw new Error(`${at}: expected an object`)
  for (const k of Object.keys(x)) if (!keys.includes(k)) throw new Error(`${at}: unknown key "${k}"`)
  for (const k of keys) if (!(k in x)) throw new Error(`${at}: missing key "${k}"`)
  return x
}
// Plain text only: it goes into a Markdown table cell (no pipe, no backtick, no angle bracket, no line break).
function text(x: unknown, at: string): string {
  if (typeof x !== 'string' || x === '' || x !== x.trim() || x.length > 200 || /[|`<>\r\n\t]/.test(x))
    throw new Error(
      `${at}: expected 1 to 200 characters of plain text (no | < > or backtick or line break, none at the ends)`,
    )
  return x
}
function finite(x: unknown, at: string): number {
  if (typeof x !== 'number' || !Number.isFinite(x)) throw new Error(`${at}: expected a finite number`)
  return x
}
function count(x: unknown, at: string): number {
  if (typeof x !== 'number' || !Number.isSafeInteger(x) || x < 1)
    throw new Error(`${at}: expected an integer of 1 or more`)
  return x
}

const GATE = /^[A-Za-z][A-Za-z0-9-]{1,31}$/
const SHA = /^[0-9a-f]{40}$/
const RUN_URL = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/actions\/runs\/(\d+)$/
const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/

function result(x: unknown, at: string): Result {
  const o = obj(x, at, ['metric', 'value', 'unit', 'threshold', 'pass', 'n', 'window'])
  const value = finite(o.value, `${at}.value`)
  let threshold: Threshold | null = null
  if (o.threshold !== null) {
    const t = obj(o.threshold, `${at}.threshold`, ['op', 'value'])
    if (!OPS.some((op) => op === t.op)) throw new Error(`${at}.threshold.op: expected one of ${OPS.join(' ')}`)
    threshold = { op: t.op as Op, value: finite(t.value, `${at}.threshold.value`) }
  }
  const pass = threshold === null ? null : holds(value, threshold)
  if (o.pass !== pass) throw new Error(`${at}.pass: must be ${String(pass)} (value against threshold)`)
  return {
    metric: text(o.metric, `${at}.metric`),
    value,
    unit: text(o.unit, `${at}.unit`),
    threshold,
    pass,
    n: count(o.n, `${at}.n`),
    window: text(o.window, `${at}.window`),
  }
}

/** Throws with the path of the first problem; returns the value with its keys in the canonical order. */
export function validateEvidence(x: unknown): Evidence {
  const o = obj(x, 'evidence', [
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
  if (o.schema !== 1) throw new Error('schema: expected 1')
  const gate = text(o.gate, 'gate')
  if (!GATE.test(gate)) throw new Error('gate: expected a letter, then letters, digits or - (2 to 32 characters)')
  if (typeof o.commit !== 'string' || !SHA.test(o.commit)) throw new Error('commit: expected the full 40-character SHA')
  const runId = count(o.runId, 'runId')
  const url = typeof o.runUrl === 'string' ? RUN_URL.exec(o.runUrl) : null
  if (url?.[1] !== String(runId))
    throw new Error('runUrl: expected https://github.com/<owner>/<repo>/actions/runs/<runId>')
  const t = typeof o.measuredAt === 'string' ? o.measuredAt : ''
  const ms = Date.parse(t)
  if (!TIME.test(t) || Number.isNaN(ms) || new Date(ms).toISOString() !== t.replace('Z', '.000Z'))
    throw new Error('measuredAt: expected a real UTC time as YYYY-MM-DDTHH:MM:SSZ')
  if (!Array.isArray(o.results) || o.results.length === 0) throw new Error('results: expected a non-empty array')
  const results = (o.results as unknown[]).map((r, i) => result(r, `results[${String(i)}]`))
  const metrics = new Set(results.map((r) => r.metric))
  if (metrics.size !== results.length) throw new Error('results: a metric appears twice')
  return {
    schema: 1,
    gate,
    commit: o.commit,
    runId,
    runUrl: o.runUrl as string,
    workflow: text(o.workflow, 'workflow'),
    event: text(o.event, 'event'),
    measuredAt: t,
    origin: text(o.origin, 'origin'),
    tool: text(o.tool, 'tool'),
    results,
  }
}

/** Fills `pass` from each threshold, then validates: a producer cannot type in a verdict that disagrees with the number. */
export function buildEvidence(i: EvidenceInput): Evidence {
  return validateEvidence({
    schema: 1,
    gate: i.gate,
    commit: i.commit,
    runId: i.runId,
    runUrl: i.runUrl,
    workflow: i.workflow,
    event: i.event,
    measuredAt: i.measuredAt,
    origin: i.origin,
    tool: i.tool,
    // A threshold that is not an object gets no verdict here: `validateEvidence` then names the key.
    results: i.results.map((r) => ({ ...r, pass: isObj(r.threshold) ? holds(r.value, r.threshold) : null })),
  })
}

export const serialize = (e: Evidence): string => `${JSON.stringify(e, null, 2)}\n`
export const nowUtc = (): string => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
export const evidenceFileName = (e: Evidence): string =>
  `${e.measuredAt.slice(0, 10)}-${e.commit.slice(0, 7)}-${String(e.runId)}.json`

/** The run a job is part of, from the GitHub Actions environment. */
export function runInfoFromEnv(env: Record<string, string | undefined>): RunInfo {
  const need = (k: string): string => {
    const v = env[k]
    if (v === undefined || v === '') throw new Error(`${k} is not set: run inside GitHub Actions, or pass --run <id>`)
    return v
  }
  const runId = need('GITHUB_RUN_ID')
  return {
    commit: need('GITHUB_SHA'),
    runId: Number(runId),
    runUrl: `${need('GITHUB_SERVER_URL')}/${need('GITHUB_REPOSITORY')}/actions/runs/${runId}`,
    workflow: need('GITHUB_WORKFLOW'),
    event: need('GITHUB_EVENT_NAME'),
  }
}

/** The run, from `gh run view <id> --json databaseId,headSha,url,workflowName,event`. */
export function runInfoFromGh(json: unknown): RunInfo {
  const o = obj(json, 'gh run view', ['databaseId', 'headSha', 'url', 'workflowName', 'event'])
  const str = (k: string): string => {
    const v = o[k]
    if (typeof v !== 'string') throw new Error(`gh run view: ${k} is not a string`)
    return v
  }
  return {
    commit: str('headSha'),
    runId: count(o.databaseId, 'databaseId'),
    runUrl: str('url'),
    workflow: str('workflowName'),
    event: str('event'),
  }
}

/** A collected file must say what GitHub says about its run. A pull request run keeps its merge commit in the file, so its commit is not compared. */
export function checkProvenance(e: Evidence, run: RunInfo): void {
  for (const k of ['runId', 'runUrl', 'workflow', 'event'] as const)
    if (e[k] !== run[k])
      throw new Error(`${e.gate}: ${k} is ${String(e[k])} in the file and ${String(run[k])} on GitHub`)
  if (run.event !== 'pull_request' && e.commit !== run.commit)
    throw new Error(`${e.gate}: commit is ${e.commit} in the file and ${run.commit} on GitHub`)
}

const group = (n: number): string => {
  const [int = '', frac] = String(n).split('.')
  const g = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return frac === undefined ? g : `${g}.${frac}`
}
/** By name, digit runs as numbers (`API-6` before `API-10`), case ignored, then by code unit. No ICU: the order is the same on every Node build. */
const byGate = (a: string, b: string): number => {
  const [pa, pb] = [a.toLowerCase().split(/(\d+)/), b.toLowerCase().split(/(\d+)/)]
  for (let i = 0; i < Math.min(pa.length, pb.length); i++) {
    const [x = '', y = ''] = [pa[i], pb[i]]
    if (x === y) continue
    if (i % 2 === 1) return Number(x) - Number(y)
    return x < y ? -1 : 1
  }
  return pa.length - pb.length || (a < b ? -1 : a > b ? 1 : 0)
}
/** Newest first: measuredAt, then the run id. */
const newest = (a: EvidenceFile, b: EvidenceFile) =>
  a.evidence.measuredAt === b.evidence.measuredAt
    ? b.evidence.runId - a.evidence.runId
    : a.evidence.measuredAt < b.evidence.measuredAt
      ? 1
      : -1

const HEAD = `# Measured results

Every number a gate measured, with its commit and run. This file is generated: \`node packages/perf/src/cli.ts evidence render\` writes it from the files in this folder, and \`packages/perf/test/evidence.test.ts\` fails when it differs from them or when a file breaks the schema. Never edit it by hand ([ADR-0043](../adr/0043-measured-results-are-committed-as-evidence-files.md)).

A number is citable only when its file is listed here. A gate with no row has no result file yet. Each gate shows the metrics of its newest file; older files stay in its folder. How a job adds a file: [packages/perf/README.md](../../packages/perf/README.md).
`

const COLUMNS = ['Gate', 'Metric', 'Threshold', 'Value', 'Result', 'Measured', 'Where', 'Commit', 'Run', 'File']

function rows(f: EvidenceFile): string[][] {
  const e = f.evidence
  const repo = e.runUrl.replace(/\/actions\/runs\/\d+$/, '')
  const path = `${f.gate}/${f.name}`
  return e.results.map((r) => [
    `[${e.gate}](${e.gate}/)`,
    r.metric,
    r.threshold === null ? 'report only' : `\`${r.threshold.op} ${group(r.threshold.value)} ${r.unit}\``,
    `${group(r.value)} ${r.unit}`,
    r.pass === null ? 'report only' : r.pass ? 'pass' : 'FAIL',
    e.measuredAt.slice(0, 10),
    `${e.workflow} (${e.event})`,
    `[${e.commit.slice(0, 7)}](${repo}/commit/${e.commit})`,
    `[${String(e.runId)}](${e.runUrl})`,
    `[\`docs/results/${path}\`](${path})`,
  ])
}

/** The README: per gate the metrics of its newest file. Pure: the same files always give the same text. */
export function renderReadme(files: EvidenceFile[]): string {
  const latest = new Map<string, EvidenceFile>()
  for (const f of [...files].sort(newest)) if (!latest.has(f.gate)) latest.set(f.gate, f)
  const newestPerGate = [...latest].sort(([a], [b]) => byGate(a, b)).map(([, f]) => f)
  const lines = [COLUMNS, COLUMNS.map(() => '---'), ...newestPerGate.flatMap(rows)]
  return `${HEAD}\n${lines.map((l) => `| ${l.join(' | ')} |`).join('\n')}\n\nFiles: ${String(files.length)}. Gates: ${String(newestPerGate.length)}.\n`
}

/** Reads every `<gate>/*.json` under `dir`; a problem is a string, not a throw, so one bad file does not hide the others. */
export function loadResults(dir: string): { files: EvidenceFile[]; problems: string[] } {
  const files: EvidenceFile[] = []
  const problems: string[] = []
  const folders = new Map<string, string>()
  // Dot files (`.DS_Store`, `.gitattributes`) are not results.
  for (const entry of readdirSync(dir).sort()) {
    if (entry === 'README.md' || entry.startsWith('.')) continue
    if (!statSync(join(dir, entry)).isDirectory()) {
      problems.push(`${entry}: only README.md and one folder per gate belong here`)
      continue
    }
    // `LOAD-1` and `load-1` would be one folder on a case-insensitive disk.
    const twin = folders.get(entry.toLowerCase())
    if (twin !== undefined) problems.push(`${entry}: the same gate as ${twin} when the case is ignored`)
    folders.set(entry.toLowerCase(), entry)
    for (const name of readdirSync(join(dir, entry)).sort()) {
      if (name.startsWith('.')) continue
      try {
        const raw = readFileSync(join(dir, entry, name), 'utf8')
        const e = validateEvidence(JSON.parse(raw))
        if (raw !== serialize(e))
          throw new Error('the bytes are not the canonical form (key order, 2-space indent, one final newline)')
        if (e.gate !== entry) throw new Error(`gate is ${e.gate} but the folder is ${entry}`)
        if (name !== evidenceFileName(e)) throw new Error(`the file must be named ${evidenceFileName(e)}`)
        files.push({ gate: entry, name, evidence: e })
      } catch (err) {
        problems.push(`${entry}/${name}: ${err instanceof Error ? err.message : 'unreadable'}`)
      }
    }
  }
  return { files, problems }
}

/** The problems of a results folder: a broken file, a stray file, or a README that is not the render of the files (first differing line). */
export function checkResults(dir: string): string[] {
  const { files, problems } = loadResults(dir)
  const readme = join(dir, 'README.md')
  if (!existsSync(readme)) return [...problems, 'README.md: missing (run `evidence render`)']
  const want = renderReadme(files).split('\n')
  const have = readFileSync(readme, 'utf8').split('\n')
  const at = want.findIndex((l, i) => l !== have[i])
  if (at >= 0 || have.length !== want.length) {
    const i = at >= 0 ? at : want.length
    problems.push(
      `README.md:${String(i + 1)}: expected "${want[i] ?? '(end of file)'}", found "${have[i] ?? '(end of file)'}"`,
    )
  }
  return problems
}

/**
 * Whether `addEvidence` would write the file, do nothing, or throw. A file that exists must be identical (evidence is never
 * edited), and a run has one file per gate: a re-run attempt or a matrix leg that measured at another time must use its own
 * gate id, not a second file of the same gate.
 */
export function checkAddable(dir: string, e: Evidence): 'new' | 'same' {
  const name = evidenceFileName(e)
  const path = join(dir, e.gate, name)
  if (existsSync(path)) {
    if (readFileSync(path, 'utf8') === serialize(e)) return 'same'
    throw new Error(`${e.gate}/${name} exists with other content; evidence files are never edited`)
  }
  const other = existsSync(join(dir, e.gate))
    ? readdirSync(join(dir, e.gate)).find((n) => n.endsWith(`-${String(e.runId)}.json`))
    : undefined
  if (other !== undefined)
    throw new Error(
      `${e.gate}: run ${String(e.runId)} already has ${other}; one file per gate and run (a matrix leg needs its own gate id)`,
    )
  return 'new'
}

/** Writes the file under its canonical name (see `checkAddable`). */
export function addEvidence(dir: string, e: Evidence): 'written' | 'same' {
  if (checkAddable(dir, e) === 'same') return 'same'
  mkdirSync(join(dir, e.gate), { recursive: true })
  writeFileSync(join(dir, e.gate, evidenceFileName(e)), serialize(e))
  return 'written'
}

/** Rewrites README.md from the files. Refuses while a file is broken, so a bad file never turns into a number. */
export function renderDir(dir: string): void {
  const { files, problems } = loadResults(dir)
  if (problems.length > 0) throw new Error(`fix these files first:\n${problems.join('\n')}`)
  writeFileSync(join(dir, 'README.md'), renderReadme(files))
}
