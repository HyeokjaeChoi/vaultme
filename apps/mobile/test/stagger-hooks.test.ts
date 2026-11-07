import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { light } from '@vaultme/tokens'
import { renderHook } from './helpers/hooks'
import { motion } from './helpers/reanimated'

vi.mock('react', async () => ({
  ...(await vi.importActual<object>('react')),
  ...(await import('./helpers/hooks')).hooks,
}))
vi.mock('react-native-reanimated', async () => (await import('./helpers/reanimated')).reanimated)

import { useLineEntering, useStaggerReveal } from '@/shared/theme/motion'
import { revealWindow, SETTLE_MS } from '@/shared/lib/stagger'

// DESIGN.md Motion: 30 ms stagger, first 5 only, first reveal from loading only, final state under Reduce Motion.
const ROW_MS = light.primitive.motion.duration.baseMs
const WINDOW = revealWindow(ROW_MS)
type Entering = { entering?: { delayMs: number; durationMs: number } }
const delayOf = (p: object) => (p as Entering).entering?.delayMs

beforeEach(() => {
  vi.useFakeTimers()
  motion.reduce = false
})
afterEach(() => vi.useRealTimers())

describe('useStaggerReveal', () => {
  const mount = (loading: boolean) => renderHook((l: boolean) => useStaggerReveal(l), loading)

  it('staggers rows 30 ms apart when the screen showed loading first', () => {
    const h = mount(true)
    h.rerender(false)
    expect([0, 1, 2, 3, 4].map((i) => delayOf(h.result.current(i)))).toEqual([0, 30, 60, 90, 120])
    expect((h.result.current(0) as Entering).entering?.durationMs).toBe(ROW_MS)
  })

  it('rows after the fifth share the fifth delay', () => {
    const h = mount(true)
    h.rerender(false)
    expect(delayOf(h.result.current(5))).toBe(120)
    expect(delayOf(h.result.current(40))).toBe(120)
  })

  it('does not stagger content that was already there (no loading first)', () => {
    const h = mount(false)
    expect(h.result.current(0)).toEqual({})
  })

  it('has no loading guard of its own: callers mount rows after loading ends', () => {
    expect(delayOf(mount(true).result.current(0))).toBe(0)
  })

  it('staggers only inside the reveal window', () => {
    const h = mount(true)
    h.rerender(false)
    h.act(() => vi.advanceTimersByTime(WINDOW - 1))
    expect(delayOf(h.result.current(0))).toBe(0)
    h.act(() => vi.advanceTimersByTime(1))
    expect(h.result.current(0)).toEqual({})
  })

  it('rows mounted after the window (refresh, scroll) get no entering', () => {
    const h = mount(true)
    h.rerender(false)
    h.act(() => vi.advanceTimersByTime(WINDOW + 1000))
    expect([0, 3, 9].map((i) => h.result.current(i))).toEqual([{}, {}, {}])
  })

  it('a reload after the window does not open a new reveal', () => {
    const h = mount(true)
    h.rerender(false)
    h.act(() => vi.advanceTimersByTime(WINDOW))
    h.rerender(true) // refetch shows loading again
    h.rerender(false)
    expect(h.result.current(0)).toEqual({})
  })

  it('a screen that opened with content does not stagger after a later reload', () => {
    const h = mount(false)
    h.rerender(true)
    h.rerender(false)
    expect(h.result.current(0)).toEqual({})
  })

  it('returns {} under Reduce Motion, even on a first reveal', () => {
    motion.reduce = true
    const h = mount(true)
    h.rerender(false)
    expect(h.result.current(0)).toEqual({})
  })
})

describe('useLineEntering', () => {
  const line = (i: number) => renderHook((n: number) => useLineEntering(n), i).result.current as Entering['entering']

  it('starts after the container settles and steps 30 ms', () => {
    expect([0, 1, 4].map((i) => line(i)?.delayMs)).toEqual([SETTLE_MS, SETTLE_MS + 30, SETTLE_MS + 120])
  })

  it('lines after the fifth share the fifth delay', () => {
    expect([5, 6, 20].map((i) => line(i)?.delayMs)).toEqual([SETTLE_MS + 120, SETTLE_MS + 120, SETTLE_MS + 120])
  })

  it('returns none under Reduce Motion', () => {
    motion.reduce = true
    expect([0, 3, 8].map((i) => line(i))).toEqual([undefined, undefined, undefined])
  })
})
