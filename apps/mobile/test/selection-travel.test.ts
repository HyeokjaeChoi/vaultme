import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { planTravel, scaleAt } from '../src/shared/theme/selection-travel'

describe('selection travel stretch (DESIGN.md Motion)', () => {
  it('stays at rest scale at both ends of the travel', () => {
    expect(scaleAt(0, 1)).toBe(1)
    expect(scaleAt(1, 1)).toBe(1)
  })
  it('peaks at the middle and never exceeds 12%', () => {
    expect(scaleAt(0.5, 1)).toBe(1.12)
    for (let p = 0; p <= 1; p += 0.05) expect(scaleAt(p, 1)).toBeLessThanOrEqual(1.12)
  })
})

describe('scaleAt (interrupted travel)', () => {
  it('equals the normal curve when the travel started at rest', () => {
    expect(scaleAt(0.5, 1)).toBe(1.12)
  })
  it('starts at the width where the last travel was interrupted, with no pop', () => {
    expect(scaleAt(0, 1.1)).toBeCloseTo(1.1)
  })
  it('never exceeds 12% and ends at rest', () => {
    for (let t = 0; t <= 1; t += 0.05) expect(scaleAt(t, 1.12)).toBeLessThanOrEqual(1.12)
    expect(scaleAt(1, 1.12)).toBe(1)
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
