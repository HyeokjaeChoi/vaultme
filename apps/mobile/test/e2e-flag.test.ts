import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// ADR-0048: `EXPO_PUBLIC_E2E=1` turns the rooted-device check off. It may exist only in the two E2E build scripts (which build for an emulator
// or simulator, never for a store). A store or EAS build with it would ship without the check.
const root = join(__dirname, '..', '..', '..')
const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean)
const read = (f: string) => readFileSync(join(root, f), 'utf8')
const mentions = (re: RegExp, files: string[]) => files.filter((f) => re.test(read(f)))
const text = tracked.filter((f) => /\.(json|ya?ml|sh|mjs|cjs|js|ts|tsx|env)$/.test(f) && !f.startsWith('docs/'))

describe('EXPO_PUBLIC_E2E', () => {
  it('is set only by the two E2E build scripts', () => {
    const setters = mentions(
      /EXPO_PUBLIC_E2E(=|:\s)/,
      text.filter((f) => !f.endsWith('.test.ts')),
    )
    expect(setters.sort()).toEqual(['apps/mobile/.maestro/build-android.sh', 'apps/mobile/.maestro/build-ios.sh'])
  })
  it('is not in an EAS profile or a workflow', () => {
    const files = ['apps/mobile/eas.json', ...tracked.filter((f) => f.startsWith('.github/workflows/'))]
    expect(mentions(/EXPO_PUBLIC_E2E/, files)).toEqual([])
  })
  it('the E2E build scripts run only in the emulator and simulator jobs, never in the EAS build job', () => {
    const callers = mentions(
      /maestro\/build-(android|ios)\.sh/,
      tracked.filter((f) => f.startsWith('.github/workflows/')),
    )
    expect(callers.sort()).toEqual(['.github/workflows/e2e.yml', '.github/workflows/release.yml'])
    // In release.yml the scripts are called by `ios-critical` and `android-critical` only: the job that runs `eas build` must not call them.
    const release = read('.github/workflows/release.yml')
    const eas = release.slice(release.indexOf('\n  eas-build:'))
    expect(eas).toContain('eas build')
    expect(eas).not.toMatch(/maestro\/build-(android|ios)\.sh/)
    expect(eas).not.toContain('EXPO_PUBLIC_E2E')
  })
})
