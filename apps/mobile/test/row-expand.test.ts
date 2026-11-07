import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from './helpers/hooks'
import { motion } from './helpers/reanimated'

vi.mock('react', async () => ({
  ...(await vi.importActual<object>('react')),
  ...(await import('./helpers/hooks')).hooks,
}))
vi.mock('react-native-reanimated', async () => (await import('./helpers/reanimated')).reanimated)

import { ExpandFromRow, measureRow } from '@/shared/theme/RowExpand'

// DESIGN.md Motion: the card expands only from a pressed, measured row. No row (deep link, push), a stale frame or Reduce Motion: the card shows as it is.
const TTL = 1500 // FRAME_TTL_MS
type Frame = { y: number; height: number }
type Style = { height?: number | 'auto'; opacity?: number; overflow?: string }
type Node = { props: { style: () => Style; children: { props: { onLayout: (e: unknown) => void } } } }

/** Mounts the card and returns the style it would show now (`{}` = not expanding). */
const mountCard = () => {
  const h = renderHook(() => ExpandFromRow({ children: null }) as unknown as Node, undefined)
  return {
    h,
    style: () => h.result.current.props.style(),
    layout: (height: number) => h.result.current.props.children.props.onLayout({ nativeEvent: { layout: { height } } }),
  }
}
const row = (frame: Frame | 'never') => ({
  measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => {
    if (frame !== 'never') cb(0, frame.y, 100, frame.height)
  },
})
const press = (frame: Frame | 'never', then = vi.fn()) => {
  measureRow(row(frame) as never, then)
  return then
}

beforeEach(() => {
  vi.useFakeTimers()
  motion.reduce = false
  mountCard().h.unmount() // the remembered frame is module state: drain what a previous test left
})
afterEach(() => vi.useRealTimers())

describe('ExpandFromRow without a measured row', () => {
  it('shows the card as it is (deep link, push notification)', () => {
    expect(mountCard().style()).toEqual({})
  })

  it('measureRow with no row calls then once, at once, and remembers nothing', () => {
    const then = vi.fn()
    measureRow(null, then)
    expect(then).toHaveBeenCalledTimes(1)
    expect(mountCard().style()).toEqual({})
  })

  it('a measure callback that never runs opens the detail after 120 ms, with no frame', () => {
    const then = press('never')
    expect(then).not.toHaveBeenCalled()
    vi.advanceTimersByTime(119)
    expect(then).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(then).toHaveBeenCalledTimes(1)
    expect(mountCard().style()).toEqual({})
  })

  it('a late measure result does not leak to the next detail or call then twice', () => {
    let late: (x: number, y: number, w: number, h: number) => void = () => undefined
    const then = vi.fn()
    measureRow({ measureInWindow: (cb: typeof late) => (late = cb) } as never, then)
    vi.advanceTimersByTime(120)
    late(0, 300, 100, 64)
    expect(then).toHaveBeenCalledTimes(1)
    expect(mountCard().style()).toEqual({})
  })
})

describe('ExpandFromRow with a measured row', () => {
  it('starts from the pressed row height, clipped and hidden until laid out', () => {
    const then = press({ y: 300, height: 64 })
    expect(then).toHaveBeenCalledTimes(1)
    expect(mountCard().style()).toMatchObject({ height: 64, overflow: 'hidden', opacity: 0 })
  })

  it('uses the frame once: the next open does not expand from an old row', () => {
    press({ y: 300, height: 64 })
    expect(mountCard().style()).toMatchObject({ height: 64 })
    expect(mountCard().style()).toEqual({})
  })

  it('never leaves the card hidden: the fallback opens it after 400 ms if measuring does not answer', () => {
    press({ y: 300, height: 64 })
    const card = mountCard()
    card.layout(120)
    expect(card.style()).toMatchObject({ opacity: 0 })
    vi.advanceTimersByTime(400)
    expect(card.style()).toEqual({ height: 'auto', overflow: 'visible', opacity: 1, transform: [{ translateY: 0 }] })
  })

  describe('stale frame (TTL 1500 ms)', () => {
    it('is used just inside the TTL', () => {
      press({ y: 300, height: 64 })
      vi.advanceTimersByTime(TTL - 1)
      expect(mountCard().style()).toMatchObject({ height: 64 })
    })

    it('is not used at the TTL', () => {
      press({ y: 300, height: 64 })
      vi.advanceTimersByTime(TTL)
      expect(mountCard().style()).toEqual({})
    })

    it('is dropped when it is old, so a later open does not use it either', () => {
      press({ y: 300, height: 64 })
      vi.advanceTimersByTime(TTL)
      mountCard()
      press({ y: 10, height: 40 }) // a fresh press still works
      expect(mountCard().style()).toMatchObject({ height: 40 })
    })
  })
})

describe('ExpandFromRow under Reduce Motion', () => {
  it('shows the card as it is, even with a measured row', () => {
    motion.reduce = true
    press({ y: 300, height: 64 })
    expect(mountCard().style()).toEqual({})
  })

  it('still takes the frame, so it does not linger for a later open', () => {
    press({ y: 300, height: 64 })
    motion.reduce = true
    mountCard()
    motion.reduce = false
    expect(mountCard().style()).toEqual({})
  })

  it('onLayout starts nothing', () => {
    motion.reduce = true
    press({ y: 300, height: 64 })
    const card = mountCard()
    expect(() => card.layout(120)).not.toThrow()
    vi.advanceTimersByTime(1000)
    expect(card.style()).toEqual({})
  })
})
