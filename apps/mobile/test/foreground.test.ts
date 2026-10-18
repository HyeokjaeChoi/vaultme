import { describe, expect, it, vi } from 'vitest'
import { createForegroundTrigger } from '../src/features/send/model/foregroundTrigger'

describe('createForegroundTrigger', () => {
  it('fires once per return to active, not for active -> active', () => {
    const fn = vi.fn()
    const t = createForegroundTrigger(fn, 'active')
    t('active')
    expect(fn).not.toHaveBeenCalled()
    t('inactive')
    t('background')
    expect(fn).not.toHaveBeenCalled()
    t('active')
    t('active')
    expect(fn).toHaveBeenCalledTimes(1)
    t('inactive')
    t('active')
    expect(fn).toHaveBeenCalledTimes(2)
  })
  it('starting in the background, the first active counts as a return', () => {
    const fn = vi.fn()
    const t = createForegroundTrigger(fn, 'background')
    t('active')
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
