import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// MOB-4, MOB-5, MOB-9: the release scripts against stub tools (no emulator, no SDK). The real tools run in release.yml.
const maestro = join(__dirname, '..', '.maestro')
const stub = (dir: string, name: string, body: string) => {
  writeFileSync(join(dir, name), `#!/usr/bin/env bash\n${body}\n`)
  chmodSync(join(dir, name), 0o755)
}

describe('android-static-gates.sh', () => {
  const run = (o: { target: string; align: number; size?: number; aapt?: string; baseline?: string }) => {
    const sdk = mkdtempSync(join(tmpdir(), 'sdk-'))
    const tools = join(sdk, 'build-tools', '99.0.0')
    mkdirSync(tools, { recursive: true })
    // The stubs check their arguments, so dropping `-P 16` or `dump badging` from the script fails a test.
    stub(
      tools,
      'aapt2',
      `[ "$1 $2" = "dump badging" ] || exit 9\n${o.aapt ?? `echo "package: name='x' targetSdkVersion:'${o.target}'"`}`,
    )
    stub(tools, 'zipalign', `case "$*" in *"-c -P 16"*) exit ${String(o.align)} ;; *) exit 9 ;; esac`)
    const apk = join(sdk, 'a.apk')
    writeFileSync(apk, Buffer.alloc(o.size ?? 10))
    return spawnSync('bash', [join(maestro, 'android-static-gates.sh'), apk], {
      encoding: 'utf8',
      env: { ...process.env, ANDROID_HOME: sdk, GITHUB_STEP_SUMMARY: '', APK_BASELINE_BYTES: o.baseline ?? '' },
    })
  }
  it('passes with targetSdk 36 and 16 KB alignment', () => {
    expect(run({ target: '36', align: 0 }).status).toBe(0)
  })
  it('fails on targetSdk 35', () => {
    const r = run({ target: '35', align: 0 })
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('targetSdkVersion is')
  })
  it('fails with a cause when aapt2 fails', () => {
    const r = run({ target: '36', align: 0, aapt: 'exit 1' })
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('aapt2 dump badging failed')
  })
  it('fails above 150 MB', () => {
    expect(run({ target: '36', align: 0, size: 150_000_001 }).status).toBe(1)
  })
  it('warns at +10 % over the baseline', () => {
    const r = run({ target: '36', align: 0, size: 1200, baseline: '1000' })
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('::warning::')
  })
  it('fails when zipalign fails', () => {
    expect(run({ target: '36', align: 1 }).status).toBe(1)
  })
})

describe('coldstart-android.sh', () => {
  const run = (totals: number[], env: Record<string, string> = {}) => {
    const bin = mkdtempSync(join(tmpdir(), 'adb-'))
    const state = join(bin, 'n')
    writeFileSync(state, '0')
    // Output of the real commands: resolve-activity prints a component last; `am start -W` prints TotalTime. Cold starts take `totals` in order.
    stub(
      bin,
      'adb',
      `args="$*"
case "$args" in
  *resolve-activity*) printf 'priority=0\\r\\ndev.stackline.vaultme/.MainActivity\\r\\n' ;;
  *"am start -W"*) n=$(cat ${state}); v=$(echo "${totals.join(' ')}" | cut -d' ' -f$((n+1))); echo $((n+1)) > ${state}; printf 'Status: ok\\r\\nTotalTime: %s\\r\\n' "$v" ;;
esac`,
    )
    stub(bin, 'sleep', 'exit 0')
    return spawnSync('bash', [join(maestro, 'coldstart-android.sh'), '/x.apk'], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH ?? ''}`,
        ANDROID_SERIAL: 'emulator-5554',
        COLDSTART_SAMPLES: '3',
        GITHUB_STEP_SUMMARY: '',
        ...env,
      },
    })
  }
  it('drops the warm-up and takes the median', () => {
    const r = run([9000, 1000, 3000, 2000])
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('median 2000 ms')
  })
  it('fails at a median of 5000 ms', () => {
    expect(run([1000, 5000, 6000, 4000]).status).toBe(1)
  })
  it('warns above +25 % of the baseline', () => {
    const r = run([1, 2000, 2000, 2000], { COLDSTART_BASELINE_MS: '1500' })
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('::warning::')
  })
})
