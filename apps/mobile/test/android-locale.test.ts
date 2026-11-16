import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The locale is set after the boot and the script waits for the framework (dry runs 43728396216 and 43784174970 lost the job to a restart race).
const script = join(__dirname, '..', '.maestro', 'android-locale.sh')
const run = (o: { bootedAfter: number; locale: string }) => {
  const calls = 'calls'
  const bin = mkdtempSync(join(tmpdir(), 'adb-'))
  const n = join(bin, 'n')
  writeFileSync(n, '0')
  const log = join(bin, calls)
  // `sys.boot_completed` reads 0 for the first `bootedAfter` polls after the restart, then 1.
  writeFileSync(
    join(bin, 'adb'),
    `#!/usr/bin/env bash
echo "$*" >> ${log}
case "$*" in
  *"getprop sys.boot_completed"*) c=$(($(cat ${n})+1)); echo $c > ${n}; if [ $c -gt ${String(o.bootedAfter)} ]; then echo 1; else echo 0; fi ;;
  *"getprop persist.sys.locale"*) echo ${o.locale} ;;
  *"ime list"*) printf 'com.google.android.inputmethod.korean/.Ime\\r\\ncom.android.inputmethod.latin/.LatinIME\\r\\n' ;;
esac\n`,
  )
  writeFileSync(join(bin, 'sleep'), '#!/usr/bin/env bash\nexit 0\n')
  chmodSync(join(bin, 'adb'), 0o755)
  chmodSync(join(bin, 'sleep'), 0o755)
  const r = spawnSync('bash', [script, 'emulator-5554'], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${bin}:${process.env.PATH ?? ''}`, ANDROID_LOCALE_TRIES: '5' },
  })
  return { ...r, calls: readFileSync(log, 'utf8') }
}

describe('android-locale.sh', () => {
  it('waits for the framework, then succeeds with ko-KR', () => {
    const r = run({ bootedAfter: 2, locale: 'ko-KR' })
    expect(r.status).toBe(0)
    // Order: root, locale, boot flag reset, zygote restart, then the unlock key at the end.
    const order = [
      'root',
      'setprop persist.sys.locale ko-KR',
      'setprop sys.boot_completed 0',
      'setprop ctl.restart zygote',
      'ime set com.android.inputmethod.latin/.LatinIME',
      'input keyevent 82',
    ]
    const at = order.map((c) => r.calls.indexOf(c))
    expect(at.every((i) => i >= 0)).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
  })
  it('fails when the locale is not Korean', () => {
    expect(run({ bootedAfter: 0, locale: 'en-US' }).status).toBe(1)
  })
  it('fails when the framework never comes back', () => {
    expect(run({ bootedAfter: 99, locale: 'ko-KR' }).status).toBe(1)
  })
})
