import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The locale is set after the boot and the script waits for the framework (dry runs 43728396216 and 43784174970 lost the job to a restart race).
const script = join(__dirname, '..', '.maestro', 'android-locale.sh')
const run = (o: { bootedAfter: number; locale: string }) => {
  const bin = mkdtempSync(join(tmpdir(), 'adb-'))
  const n = join(bin, 'n')
  writeFileSync(n, '0')
  // `sys.boot_completed` reads 0 for the first `bootedAfter` polls after the restart, then 1.
  writeFileSync(
    join(bin, 'adb'),
    `#!/usr/bin/env bash
case "$*" in
  *"getprop sys.boot_completed"*) c=$(($(cat ${n})+1)); echo $c > ${n}; if [ $c -gt ${String(o.bootedAfter)} ]; then echo 1; else echo 0; fi ;;
  *"getprop persist.sys.locale"*) echo ${o.locale} ;;
esac\n`,
  )
  writeFileSync(join(bin, 'sleep'), '#!/usr/bin/env bash\nexit 0\n')
  chmodSync(join(bin, 'adb'), 0o755)
  chmodSync(join(bin, 'sleep'), 0o755)
  return spawnSync('bash', [script, 'emulator-5554'], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${bin}:${process.env.PATH ?? ''}`, ANDROID_LOCALE_TRIES: '5' },
  })
}

describe('android-locale.sh', () => {
  it('waits for the framework, then succeeds with ko-KR', () => {
    expect(run({ bootedAfter: 2, locale: 'ko-KR' }).status).toBe(0)
  })
  it('fails when the locale is not Korean', () => {
    expect(run({ bootedAfter: 0, locale: 'en-US' }).status).toBe(1)
  })
  it('fails when the framework never comes back', () => {
    expect(run({ bootedAfter: 99, locale: 'ko-KR' }).status).toBe(1)
  })
})
