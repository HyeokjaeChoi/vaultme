import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// CHAIN-1 (ADR-0040): run.sh retries a failed flow once, but never a flow tagged `funded`: a retry would broadcast a second real send.
const maestro = join(__dirname, '..', '.maestro')
const flows = readdirSync(join(maestro, 'flows')).filter((f) => f.endsWith('.yaml'))
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
