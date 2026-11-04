import { describe, expect, it } from 'vitest'
import { buildLicenses } from '../scripts/generate-licenses.mjs'
import type { LicenseEntry } from '../src/features/licenses'

type Built = { assets: LicenseEntry[]; libs: LicenseEntry[]; texts: Record<string, string> }
const data = buildLicenses() as unknown as Built
const find = (name: string) => data.libs.find((l) => l.name === name)
const text = (e?: LicenseEntry) => (e?.variants[0]?.text ? data.texts[e.variants[0].text] : undefined)

describe('generated license list (S64 / S65)', () => {
  it('has the app packages, transitive dependencies included', () => {
    expect(data.libs.length).toBeGreaterThan(100)
    // direct dependency
    expect(find('react-native')).toBeTruthy()
    // transitive: not in apps/mobile/package.json, pulled in by @vaultme/wallet-core (viem) and expo
    expect(find('viem')).toBeTruthy()
    expect(find('metro')).toBeTruthy()
  })

  it.each(['@solar-icons/react-native', 'react-native-svg'])('%s has a license and its full text', (name) => {
    const e = find(name)
    expect(e?.license).toBe('MIT')
    expect(text(e)).toContain('Permission is hereby granted')
    expect(e?.variants[0]?.copyright).toMatch(/^Copyright/)
  })

  it('has the icon and font assets with their license texts', () => {
    const by = (n: string) => data.assets.find((a) => a.name === n)
    expect(by('Solar Icons by 480 Design')?.license).toBe('CC BY 4.0')
    expect(text(by('Solar Icons by 480 Design'))).toContain('Attribution 4.0 International')
    for (const n of ['Pretendard', 'IBM Plex Mono']) {
      expect(by(n)?.license).toBe('OFL-1.1')
      expect(text(by(n))).toContain('SIL OPEN FONT LICENSE Version 1.1')
    }
  })

  it("does not list this repo's own packages", () => {
    expect(data.libs.some((l) => l.name.startsWith('@vaultme/'))).toBe(false)
  })

  it('lists one row per package name, newest version first', () => {
    const names = data.libs.map((l) => l.name)
    expect(new Set(names).size).toBe(names.length)
    // chalk is installed as 2.x, 4.x and 5.x
    expect(find('chalk')?.variants.flatMap((v) => v.versions)).toEqual(['5.6.2', '4.1.2', '2.4.2'])
  })

  it('keeps one variant per distinct license text of a name', () => {
    // chalk 2.4.2 and 4.1.2 share one text; 5.6.2 has another
    expect(find('chalk')?.variants.map((v) => v.versions)).toEqual([['5.6.2'], ['4.1.2', '2.4.2']])
    // debug 2.6.9 and 3.2.7 share a text; 4.x has another
    expect(find('debug')?.variants).toHaveLength(2)
    // react-is 16 and 18 share a text; 19 has another
    expect(find('react-is')?.variants.map((v) => v.versions.length)).toEqual([1, 2])
  })
})
