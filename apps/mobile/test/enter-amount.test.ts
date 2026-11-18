import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Android emulator: the bottom keypad row is under the footer until the screen is scrolled (dry run 44297931307; tag run 44225225354 funded-1).
const sub = (f: string) => readFileSync(join(__dirname, '..', '.maestro', 'subflows', f), 'utf8')

describe('enter-amount subflow', () => {
  const text = sub('enter-amount.yaml')
  it('scrolls on Android before the first keypad tap', () => {
    const scroll = /platform: Android\s+commands:\s+- scroll\b/.exec(text)
    expect(scroll).not.toBeNull()
    expect(scroll!.index).toBeLessThan(text.indexOf('tap-key.yaml'))
  })
  it('send-funded types the amount through it, not with its own key taps', () => {
    const s = sub('send-funded.yaml')
    expect(s).toContain('file: enter-amount.yaml')
    expect(s).not.toContain('tap-key.yaml')
  })
})
