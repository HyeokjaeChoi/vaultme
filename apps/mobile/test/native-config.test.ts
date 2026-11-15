import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// SEC-11 (docs/plans/quality-gates.md): the evaluated native config (config plugins applied, no prebuild) keeps its safe values.
// `expo config --type introspect` prints the config plus `_internal.modResults.android.manifest` (the merged AndroidManifest the plugins produce).
type Manifest = {
  manifest?: { 'uses-permission'?: { $: { 'android:name': string } }[]; application?: { $: Record<string, string> }[] }
}
type Introspect = {
  ios?: { infoPlist?: Record<string, unknown>; entitlements?: Record<string, unknown> }
  _internal?: { modResults?: { android?: { manifest?: Manifest } } }
}
const appDir = new URL('..', import.meta.url).pathname
const cfg = JSON.parse(
  execFileSync('pnpm', ['exec', 'expo', 'config', '--type', 'introspect', '--json'], { cwd: appDir, encoding: 'utf8' }),
) as Introspect
const manifest = cfg._internal?.modResults?.android?.manifest?.manifest
const application = manifest?.application?.[0]?.$ ?? {}

const allowed = (file: string): string[] =>
  readFileSync(new URL(file, import.meta.url), 'utf8')
    .split('\n')
    .map((l) => l.replace(/#.*$/, '').trim())
    .filter(Boolean)

// iOS entitlements the app may carry. Keychain access uses the default group, so none is listed here.
const IOS_ENTITLEMENTS = ['aps-environment']

describe('native config (SEC-11)', () => {
  it('the merged manifest is read (guards the checks below)', () => {
    expect(manifest?.['uses-permission']?.length).toBeGreaterThan(0)
    expect(application['android:name']).toBeTruthy()
  })

  it('Android: backup off, no cleartext traffic (merged manifest)', () => {
    expect(application['android:allowBackup']).toBe('false')
    expect(application['android:usesCleartextTraffic'] ?? 'false').toBe('false')
  })

  it('Android permissions in the merged manifest equal android-permissions.allow', () => {
    const names = (manifest?.['uses-permission'] ?? []).map((p) => p.$['android:name'])
    expect([...new Set(names)].sort()).toEqual(allowed('../android-permissions.allow').sort())
  })

  it('iOS: app.json sets no App Transport Security exception', () => {
    const app = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')) as {
      expo: { ios?: { infoPlist?: Record<string, unknown> } }
    }
    expect(app.expo.ios?.infoPlist).not.toHaveProperty('NSAppTransportSecurity')
  })

  // Without a local `ios/` folder Expo evaluates a stub Info.plist with NSAllowsArbitraryLoads true, which says nothing about the app.
  // CI has no `ios/`, so the merged Info.plist of the real build is checked by SEC-6 (U1); here only a checkout with `ios/` is checked.
  it.skipIf(!existsSync(new URL('../ios', import.meta.url)))(
    'iOS: no arbitrary loads (local networking is fine)',
    () => {
      const ats = (cfg.ios?.infoPlist?.NSAppTransportSecurity ?? {}) as Record<string, unknown>
      expect(ats.NSAllowsArbitraryLoads ?? false).toBe(false)
      expect(ats.NSAllowsArbitraryLoadsInWebContent ?? false).toBe(false)
      expect(ats.NSAllowsArbitraryLoadsForMedia ?? false).toBe(false)
    },
  )

  it('iOS entitlements are inside the allow-list', () => {
    expect(Object.keys(cfg.ios?.entitlements ?? {}).filter((k) => !IOS_ENTITLEMENTS.includes(k))).toEqual([])
  })
})
