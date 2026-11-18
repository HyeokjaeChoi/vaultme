import { spawnSync } from 'node:child_process'
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// CHAIN-1 (ADR-0040): run.sh retries a failed flow once, but never a flow tagged `funded`: a retry would broadcast a second real send.
const maestro = join(__dirname, '..', '.maestro')
const flows = readdirSync(join(maestro, 'flows')).filter((f) => f.endsWith('.yaml') && f !== 'config.yaml') // config.yaml is the order of the flows, not a flow
const info = flows.map((file) => {
  const text = readFileSync(join(maestro, 'flows', file), 'utf8')
  return {
    file: `flows/${file}`,
    name: /^name: (.+)$/m.exec(text)?.[1] ?? '',
    funded: /^tags:.*\bfunded\b/m.test(text),
  }
})

const classify = (failed: string[]) => {
  const xml = `<testsuites><testsuite>${['a pass', ...failed]
    .map((n, i) => `<testcase name="${n}">${i ? '<failure>boom</failure>' : ''}</testcase>`)
    .join('')}</testsuite></testsuites>`
  const report = join(mkdtempSync(join(tmpdir(), 'retry-')), 'e2e-report.xml')
  writeFileSync(report, xml)
  const r = spawnSync('bash', [join(maestro, 'retry-flows.sh'), report], { encoding: 'utf8' })
  expect(r.status).toBe(0)
  return r.stdout.split('\n').filter(Boolean).sort()
}

describe('retry-flows.sh', () => {
  it('finds the funded flows of the repo', () => {
    expect(info.filter((f) => f.funded).length).toBeGreaterThanOrEqual(2)
    expect(info.every((f) => f.name !== '')).toBe(true)
  })
  it('lists a failed funded flow as funded, never as retry', () => {
    for (const f of info.filter((x) => x.funded)) expect(classify([f.name])).toEqual([`funded ${f.file}`])
  })
  it('lists a failed non-funded flow as retry', () => {
    for (const f of info.filter((x) => !x.funded)) expect(classify([f.name])).toEqual([`retry ${f.file}`])
  })
  it('lists both kinds when both failed, and nothing when nothing failed', () => {
    const funded = info.find((f) => f.funded)!
    const plain = info.find((f) => !f.funded)!
    expect(classify([funded.name, plain.name])).toEqual([`funded ${funded.file}`, `retry ${plain.file}`])
    expect(classify([])).toEqual([])
  })
  it('reports a failed flow that matches no file, so it cannot pass unseen', () => {
    expect(classify(['no such flow'])).toEqual(['unknown no such flow'])
  })
})

// run.sh, release mode, with stub tools (no simulator): a failed funded flow fails the job, but the failed non-funded flow still gets its one retry,
// and the retry never contains a funded flow (it would broadcast again).
describe('run.sh release with a failed funded flow', () => {
  it('retries the plain failed flow only, then exits 1', () => {
    const root = mkdtempSync(join(tmpdir(), 'runsh-'))
    cpSync(maestro, join(root, '.maestro'), { recursive: true })
    const bin = join(root, 'bin')
    mkdirSync(bin)
    const funded = info.find((f) => f.funded)!
    const plain = info.find((f) => !f.funded)!
    const calls = join(root, 'calls.txt')
    const stub = (name: string, body: string) => {
      writeFileSync(join(bin, name), `#!/usr/bin/env bash\n${body}\n`)
      chmodSync(join(bin, name), 0o755)
    }
    stub('xcrun', 'exit 0')
    stub('sleep', 'exit 0')
    // The first call is the whole run: it writes a report with both flows failed. Later calls are the retry; the warm-up is not recorded.
    const report = `<testsuites><testsuite><testcase name="${funded.name}"><failure>x</failure></testcase><testcase name="${plain.name}"><failure>x</failure></testcase></testsuite></testsuites>`
    stub(
      'maestro',
      `case "$*" in *warmup.yaml*) exit 0 ;; esac
if [ ! -f ${calls} ]; then echo first > ${calls}; printf '%s' '${report}' > ../e2e-report.xml; exit 1; fi
echo "$*" >> ${calls}; exit 0`,
    )
    const r = spawnSync('bash', [join(root, '.maestro', 'run.sh'), 'release', 'x.app'], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${bin}:${process.env.PATH ?? ''}`, SIM_UDID: 'UDID', GITHUB_STEP_SUMMARY: '' },
    })
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('funded flow failed and is never retried')
    const retry = readFileSync(calls, 'utf8').split('\n').slice(1).join('\n')
    expect(retry).toContain(plain.file)
    expect(retry).not.toContain(funded.file)
  })
})
