import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// SEC-11 (docs/plans/quality-gates.md): the evaluated native config (config plugins applied, no prebuild) keeps its safe values.
// `expo config --type introspect` prints android.permissions, ios.infoPlist and ios.entitlements.
type Introspect = {
  android?: Record<string, unknown> & { allowBackup?: boolean; permissions?: string[] }
  ios?: { infoPlist?: Record<string, unknown>; entitlements?: Record<string, unknown> }
}
const appDir = new URL('..', import.meta.url).pathname
const cfg = JSON.parse(
  execFileSync('npx', ['expo', 'config', '--type', 'introspect', '--json'], { cwd: appDir, encoding: 'utf8' }),
) as Introspect

const allowed = (file: string): string[] =>
  readFileSync(new URL(file, import.meta.url), 'utf8')
    .split('\n')
    .map((l) => l.replace(/#.*$/, '').trim())
    .filter(Boolean)

// iOS entitlements the app may carry. Keychain access uses the default group, so none is listed here.
const IOS_ENTITLEMENTS = ['aps-environment']

describe('native config (SEC-11)', () => {
  it('Android: backup off, no cleartext traffic', () => {
    expect(cfg.android?.allowBackup).toBe(false)
    expect(cfg.android?.usesCleartextTraffic ?? false).toBe(false)
  })

  it('Android permissions equal android-permissions.allow', () => {
    expect([...(cfg.android?.permissions ?? [])].sort()).toEqual(allowed('../android-permissions.allow').sort())
  })

  it('iOS: no arbitrary loads (local networking for the dev client is fine)', () => {
    const ats = (cfg.ios?.infoPlist?.NSAppTransportSecurity ?? {}) as Record<string, unknown>
    expect(ats.NSAllowsArbitraryLoads ?? false).toBe(false)
    expect(ats.NSAllowsArbitraryLoadsInWebContent ?? false).toBe(false)
    expect(ats.NSAllowsArbitraryLoadsForMedia ?? false).toBe(false)
  })

  it('iOS entitlements are inside the allow-list', () => {
    expect(Object.keys(cfg.ios?.entitlements ?? {}).filter((k) => !IOS_ENTITLEMENTS.includes(k))).toEqual([])
  })
})
