import { describe, expect, it } from 'vitest'
import { revealWindow, SETTLE_MS, staggerDelay, staggers } from '@/shared/lib/stagger'

// DESIGN.md Motion (PR #463): 30 ms stagger, first 5 only, first reveal from loading, final state under Reduce Motion.
describe('staggerDelay', () => {
  it('steps 30 ms per item', () => {
    expect([0, 1, 2, 3, 4].map((i) => staggerDelay(i))).toEqual([0, 30, 60, 90, 120])
  })
  it('shows items after the fifth with the fifth', () => {
    expect(staggerDelay(5)).toBe(staggerDelay(4))
    expect(staggerDelay(40)).toBe(120)
  })
  it('a detail line starts after the container settles', () => {
    expect(staggerDelay(0, SETTLE_MS)).toBe(120)
    expect(staggerDelay(9, SETTLE_MS)).toBe(240)
  })
  it('the reveal window covers the last delay plus the row time', () => {
    expect(revealWindow(200)).toBe(320)
  })
})

describe('staggers', () => {
  const on = { sawLoading: true, open: true, reduce: false }
  it('animates the first reveal from loading', () => expect(staggers(on)).toBe(true))
  it('does not animate content that was already there', () =>
    expect(staggers({ ...on, sawLoading: false })).toBe(false))
  it('does not animate rows that mount after the window (refresh, scroll)', () =>
    expect(staggers({ ...on, open: false })).toBe(false))
  it('does not animate under Reduce Motion', () => expect(staggers({ ...on, reduce: true })).toBe(false))
})
