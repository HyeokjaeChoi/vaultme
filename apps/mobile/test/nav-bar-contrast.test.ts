import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')

// RN reads android:enforceNavigationBarContrast (default true); with 3-button nav the system then draws a grey scrim.
describe('Android navigation bar has no contrast scrim', () => {
  it('app.json turns enforceContrast off through expo-navigation-bar', () => {
    const config = JSON.parse(read('../app.json')) as { expo: { plugins: unknown[] } }
    const { plugins } = config.expo
    expect(plugins).toContainEqual(['expo-navigation-bar', { enforceContrast: false }])
  })
  it('the app mounts NavigationBar so button colour follows the theme', () => {
    expect(read('../src/shell/providers.tsx')).toContain('<NavigationBar style="auto" />')
  })
  it('the scan screen keeps light buttons over its dark scrim in both themes', () => {
    expect(read('../src/pages/send/scan.tsx')).toContain('<NavigationBar style="light" />')
  })
})
