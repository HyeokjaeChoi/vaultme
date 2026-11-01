import { describe, expect, it, vi } from 'vitest'
import { shouldWarnDevice } from '@/features/device-check/model/deviceCheck'

function make(over: { rooted?: boolean | Error; shown?: boolean } = {}) {
  const rooted = over.rooted ?? false
  const markShown = vi.fn()
  const isRooted = vi.fn(() => (rooted instanceof Error ? Promise.reject(rooted) : Promise.resolve(rooted)))
  return { isRooted, markShown, deps: { isRooted, wasShown: () => over.shown ?? false, markShown } }
}

describe('shouldWarnDevice (ADR-0028)', () => {
  it('rooted and not shown yet: warns and remembers it', async () => {
    const m = make({ rooted: true })
    expect(await shouldWarnDevice(m.deps)).toBe(true)
    expect(m.markShown).toHaveBeenCalledOnce()
  })
  it('not rooted: no warning, nothing saved', async () => {
    const m = make({ rooted: false })
    expect(await shouldWarnDevice(m.deps)).toBe(false)
    expect(m.markShown).not.toHaveBeenCalled()
  })
  it('check throws: no warning, nothing saved', async () => {
    const m = make({ rooted: new Error('native') })
    expect(await shouldWarnDevice(m.deps)).toBe(false)
    expect(m.markShown).not.toHaveBeenCalled()
  })
  it('already shown: no warning and no check', async () => {
    const m = make({ rooted: true, shown: true })
    expect(await shouldWarnDevice(m.deps)).toBe(false)
    expect(m.isRooted).not.toHaveBeenCalled()
  })
})
