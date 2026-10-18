import { describe, expect, it } from 'vitest'
import { createScanGate } from '../src/shared/lib/scanGate'

describe('createScanGate', () => {
  it('handles a code once while it stays in view', () => {
    const g = createScanGate(1500)
    expect(g.accept('A', 0)).toBe(true)
    for (let t = 100; t <= 10000; t += 100) expect(g.accept('A', t)).toBe(false)
  })
  it('handles a different code at once', () => {
    const g = createScanGate(1500)
    expect(g.accept('A', 0)).toBe(true)
    expect(g.accept('B', 50)).toBe(true)
    expect(g.accept('A', 100)).toBe(true)
  })
  it('handles the same code again after it left the frame for more than the quiet time', () => {
    const g = createScanGate(1500)
    expect(g.accept('A', 0)).toBe(true)
    expect(g.accept('A', 1500)).toBe(false)
    expect(g.accept('A', 3001)).toBe(true)
  })
  it('touch keeps a paused code counted as seen (dismissed sheet does not reopen)', () => {
    const g = createScanGate(1500)
    expect(g.accept('A', 0)).toBe(true)
    g.touch(5000) // the sheet was open and was closed at 5 s, detection paused meanwhile
    expect(g.accept('A', 5100)).toBe(false)
    expect(g.accept('A', 6700)).toBe(true)
  })
})
