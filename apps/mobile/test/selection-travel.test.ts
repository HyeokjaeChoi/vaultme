import { describe, expect, it, vi } from 'vitest'

// motion.ts imports Reanimated; only the pure helpers run here, so the native module is stubbed.
vi.mock('react-native-reanimated', () => ({
  Easing: { bezier: () => 0, linear: 0 },
  cubicBezier: () => 0,
  interpolate: (x: number, input: number[], output: number[]) => {
    const i = x <= input[1]! ? 0 : 1
    const f = (x - input[i]!) / (input[i + 1]! - input[i]!)
    return output[i]! + f * (output[i + 1]! - output[i]!)
  },
}))
vi.mock('@vaultme/tokens', () => ({ light: { primitive: { motion: { duration: { fastMs: 120 } } } } }))

const { STRETCH_MAX, stretchAt } = await import('../src/shared/theme/motion')

describe('selection travel stretch (DESIGN.md Motion)', () => {
  it('stays at rest scale at both ends of the travel', () => {
    expect(stretchAt(0)).toBe(1)
    expect(stretchAt(1)).toBe(1)
  })
  it('peaks at the middle and never exceeds 12%', () => {
    expect(STRETCH_MAX).toBeLessThanOrEqual(1.12)
    expect(stretchAt(0.5)).toBe(STRETCH_MAX)
    for (let p = 0; p <= 1; p += 0.05) expect(stretchAt(p)).toBeLessThanOrEqual(1.12)
  })
})
