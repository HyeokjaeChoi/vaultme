import { readFileSync } from 'node:fs'
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

const { STRETCH_MAX, planTravel, stretchAt } = await import('../src/shared/theme/motion')

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

describe('planTravel', () => {
  it('Reduce Motion jumps to the slot with no animation', () => {
    expect(planTravel(true, 0, 0, 1)).toEqual({ from: 1, animate: false })
  })
  it('does not travel or stretch on mount or when the slot is unchanged', () => {
    expect(planTravel(false, 1, 1, 1)).toEqual({ from: 1, animate: false })
  })
  it('travels from the current position to a new slot', () => {
    expect(planTravel(false, 0, 0, 1)).toEqual({ from: 0, animate: true })
    expect(planTravel(false, 0.4, 0, 1)).toEqual({ from: 0.4, animate: true }) // interrupted mid-travel
  })
})

describe('selection state changes at once', () => {
  const ui = new URL('../src/shared/ui/', import.meta.url).pathname
  it('Switch and Segmented take checked and colors from props, not from the animation', () => {
    const sw = readFileSync(`${ui}Switch.tsx`, 'utf8')
    const sg = readFileSync(`${ui}Segmented.tsx`, 'utf8')
    expect(sw).toContain('accessibilityState={{ checked: value')
    expect(sw).toContain('backgroundColor: value ? t.component.switch.track.on')
    expect(sg).toContain('accessibilityState={{ checked: on }}')
    expect(sg).toContain('color={on ? t.component.segmented.selectedFg')
    expect(sw + sg).not.toContain('transitionProperty')
  })
})
