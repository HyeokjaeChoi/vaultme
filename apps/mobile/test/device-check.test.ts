import { describe, expect, it, vi } from 'vitest'
import { shouldWarnDevice } from '@/features/device-check/model/deviceCheck'

function make(over: { rooted?: boolean | Error; shown?: boolean } = {}) {
  const rooted = over.rooted ?? false
  const isRooted = vi.fn(() => {
    if (rooted instanceof Error) throw rooted
    return rooted
  })
  return { isRooted, deps: { isRooted, wasShown: () => over.shown ?? false } }
}

describe('shouldWarnDevice (SEC-8, ADR-0048)', () => {
  it('rooted and not shown yet: warns', () => {
    const m = make({ rooted: true })
    expect(shouldWarnDevice(m.deps)).toBe(true)
  })
  it('not rooted: no warning', () => {
    const m = make({ rooted: false })
    expect(shouldWarnDevice(m.deps)).toBe(false)
  })
  it('check throws: no warning', () => {
    const m = make({ rooted: new Error('native') })
    expect(shouldWarnDevice(m.deps)).toBe(false)
  })
  it('already shown: no warning and no check', () => {
    const m = make({ rooted: true, shown: true })
    expect(shouldWarnDevice(m.deps)).toBe(false)
    expect(m.isRooted).not.toHaveBeenCalled()
  })
})
