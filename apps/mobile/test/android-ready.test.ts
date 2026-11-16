import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The install must wait for the package service (dry run 43774041050: "Broken pipe" right after the locale restart).
const script = join(__dirname, '..', '.maestro', 'android-ready.sh')
const run = (failBefore: number, tries = '5', installFails = 0, booted = '1') => {
  const bin = mkdtempSync(join(tmpdir(), 'adb-'))
  const n = join(bin, 'n')
  writeFileSync(n, '0')
  const m = join(bin, 'm')
  writeFileSync(m, '0')
  // The first `failBefore` calls of `pm path` fail (service down); `getprop` says boot is complete all the time.
  writeFileSync(
    join(bin, 'adb'),
    `#!/usr/bin/env bash
case "$*" in
  *getprop*) echo ${booted} ;;
  *"pm path"*) c=$(($(cat ${n})+1)); echo $c > ${n}; [ $c -gt ${String(failBefore)} ] ;;
  *install*) c=$(($(cat ${m})+1)); echo $c > ${m}; [ $c -gt ${String(installFails)} ] && echo Success ;;
esac\n`,
  )
  writeFileSync(join(bin, 'sleep'), '#!/usr/bin/env bash\nexit 0\n')
  chmodSync(join(bin, 'adb'), 0o755)
  chmodSync(join(bin, 'sleep'), 0o755)
  return spawnSync('bash', [script, 'emulator-5554', '/x.apk'], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${bin}:${process.env.PATH ?? ''}`, ANDROID_READY_TRIES: tries },
  })
}

describe('android-ready.sh', () => {
  it('installs at once when the service is up', () => {
    expect(run(0).status).toBe(0)
  })
  it('waits while the package service is down, then installs', () => {
    const r = run(2)
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('try 2 of 5')
  })
  it('retries an install that fails although the service answers', () => {
    const r = run(0, '5', 2)
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('try 2 of 5')
  })
  it('waits while the boot is not complete', () => {
    expect(run(0, '3', 0, '0').status).toBe(1)
  })
  it('fails when the service never comes up', () => {
    expect(run(99).status).toBe(1)
  })
})
