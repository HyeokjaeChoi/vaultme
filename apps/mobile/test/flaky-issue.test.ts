import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// FLAKY-1: one rolling flaky issue per flow. A flaky retry comments on the open issue and never opens a second one.
const script = join(__dirname, '..', '.maestro', 'flaky-issue.sh')
const run = (log: string, openIssue: string) => {
  const dir = mkdtempSync(join(tmpdir(), 'flaky-'))
  const calls = join(dir, 'calls')
  // A fake `gh`: `issue list` answers with the open issue number (or nothing); every call is recorded.
  writeFileSync(
    join(dir, 'gh'),
    `#!/usr/bin/env bash\necho "$@" >> "${calls}"\n[ "$2" = list ] && echo "${openIssue}"\nexit 0\n`,
  )
  chmodSync(join(dir, 'gh'), 0o755)
  const logFile = join(dir, 'critical.log')
  writeFileSync(logFile, log)
  const r = spawnSync('bash', [script, 'iOS', logFile, 'v0.1.0'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${dir}:${process.env.PATH ?? ''}`,
      GITHUB_REPOSITORY: 'o/r',
      GITHUB_SERVER_URL: 'https://github.com',
      GITHUB_RUN_ID: '9',
    },
  })
  expect(r.status).toBe(0)
  try {
    return readFileSync(calls, 'utf8').trim().split('\n')
  } catch {
    return []
  }
}

describe('flaky-issue.sh', () => {
  it('does nothing when no flow was flaky', () => {
    expect(run('all good\n', '')).toEqual([])
  })
  it('opens one labeled issue per flaky flow when none is open', () => {
    const calls = run('::warning::flaky: retrying flows/restore.yaml flows/send.yaml\n', '')
    expect(calls.filter((c) => c.startsWith('issue create'))).toHaveLength(2)
    expect(calls.join('\n')).toMatch(/--label flaky/)
    expect(calls.join('\n')).toMatch(/flaky e2e: restore\.yaml \(iOS\)/)
  })
  it('comments on the open issue and opens no new one', () => {
    const calls = run('::warning::flaky: retrying flows/restore.yaml\n', '388')
    expect(calls.some((c) => c.startsWith('issue create'))).toBe(false)
    expect(calls.some((c) => c.startsWith('issue comment 388'))).toBe(true)
  })
})
