import { beforeEach, describe, expect, it, vi } from 'vitest'

const calls: string[] = []
let allowFails = false
vi.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: (k: string) => Promise.resolve(void calls.push(`prevent:${k}`)),
  allowScreenCaptureAsync: (k: string) =>
    allowFails ? Promise.reject(new Error('allow failed')) : Promise.resolve(void calls.push(`allow:${k}`)),
  enableAppSwitcherProtectionAsync: () => Promise.resolve(void calls.push('switcher:on')),
  disableAppSwitcherProtectionAsync: () => Promise.resolve(void calls.push('switcher:off')),
}))

import { protectPhrase, releasePhrase } from '../src/features/backup/model/capture'

describe('phrase screen capture protection (SEC-7, ADR-J)', () => {
  beforeEach(() => {
    calls.length = 0
    allowFails = false
  })

  it('iOS: the switcher blur is on before the caller can reveal (path 1 of 2)', async () => {
    await protectPhrase('k', true)
    expect(calls).toEqual(['prevent:k', 'switcher:on'])
  })
  it('iOS: blur and capture block are both released on blur (path 2 of 2)', async () => {
    await releasePhrase('k', true)
    expect(calls).toEqual(['allow:k', 'switcher:off'])
  })
  it('iOS: the blur is still released when the capture release rejects', async () => {
    allowFails = true
    await expect(releasePhrase('k', true)).rejects.toThrow('allow failed')
    expect(calls).toEqual(['switcher:off'])
  })
  it('Android: only FLAG_SECURE; the iOS-only blur API is never called', async () => {
    await protectPhrase('k', false)
    await releasePhrase('k', false)
    expect(calls).toEqual(['prevent:k', 'allow:k'])
  })
})

import { readFileSync } from 'node:fs'
describe('S03 wiring', () => {
  const page = readFileSync(new URL('../src/pages/backup/index.tsx', import.meta.url), 'utf8')
  it('uses the shared helper, never the raw capture calls', () => {
    expect(page).toContain('protectPhrase(CAPTURE_KEY, IOS)')
    expect(page).not.toMatch(/\b(prevent|allow)ScreenCaptureAsync\b/)
  })
  it('protects before it asks for the phrase', () => {
    const reveal = page.slice(page.indexOf('const reveal'))
    expect(reveal.indexOf('await protectPhrase')).toBeGreaterThan(-1)
    expect(reveal.indexOf('await protectPhrase')).toBeLessThan(reveal.indexOf('loadPhrase('))
  })
})
