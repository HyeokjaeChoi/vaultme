import { describe, expect, it } from 'vitest'
import { buildLicenses } from '../scripts/generate-licenses.mjs'
import type { LicenseEntry } from '../src/features/licenses'

type Built = { assets: LicenseEntry[]; libs: LicenseEntry[]; texts: Record<string, string> }
const data = buildLicenses() as unknown as Built
const find = (name: string) => data.libs.find((l) => l.name === name)

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
    const text = e?.text ? data.texts[e.text] : undefined
    expect(text).toContain('Permission is hereby granted')
    expect(e?.copyright).toMatch(/^Copyright/)
  })

  it('has the icon and font assets with their license texts', () => {
    const by = (n: string) => data.assets.find((a) => a.name === n)
    expect(by('Solar Icons by 480 Design')?.license).toBe('CC BY 4.0')
    expect(data.texts[by('Solar Icons by 480 Design')?.text ?? '']).toContain('Attribution 4.0 International')
    for (const n of ['Pretendard', 'IBM Plex Mono']) {
      expect(by(n)?.license).toBe('OFL-1.1')
      expect(data.texts[by(n)?.text ?? '']).toContain('SIL OPEN FONT LICENSE Version 1.1')
    }
  })

  it("does not list this repo's own packages", () => {
    expect(data.libs.some((l) => l.name.startsWith('@vaultme/'))).toBe(false)
  })
})
