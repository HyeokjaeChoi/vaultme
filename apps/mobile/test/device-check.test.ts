import { describe, expect, it, vi } from 'vitest'
import { shouldWarnDevice } from '@/features/device-check/model/deviceCheck'

function make(over: { rooted?: boolean | Error; shown?: boolean } = {}) {
  const rooted = over.rooted ?? false
  const markShown = vi.fn()
  const isRooted = vi.fn(() => {
    if (rooted instanceof Error) throw rooted
    return rooted
  })
  return { isRooted, markShown, deps: { isRooted, wasShown: () => over.shown ?? false, markShown } }
}

describe('shouldWarnDevice (SEC-8, ADR-0050)', () => {
  it('rooted and not shown yet: warns and remembers it', () => {
    const m = make({ rooted: true })
    expect(shouldWarnDevice(m.deps)).toBe(true)
    expect(m.markShown).toHaveBeenCalledOnce()
  })
  it('not rooted: no warning, nothing saved', () => {
    const m = make({ rooted: false })
    expect(shouldWarnDevice(m.deps)).toBe(false)
    expect(m.markShown).not.toHaveBeenCalled()
  })
  it('check throws: no warning, nothing saved', () => {
    const m = make({ rooted: new Error('native') })
    expect(shouldWarnDevice(m.deps)).toBe(false)
    expect(m.markShown).not.toHaveBeenCalled()
  })
  it('already shown: no warning and no check', () => {
    const m = make({ rooted: true, shown: true })
    expect(shouldWarnDevice(m.deps)).toBe(false)
    expect(m.isRooted).not.toHaveBeenCalled()
  })
})
