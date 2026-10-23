import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  selectionAsync: vi.fn(async () => undefined),
  notificationAsync: vi.fn(async () => undefined),
}))
vi.mock('expo-haptics', () => ({
  ...h,
  impactAsync: vi.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'l' },
  NotificationFeedbackType: { Warning: 'w', Success: 's', Error: 'e' },
}))

import { keyHaptic } from '../src/shared/lib/haptics'

describe('keyHaptic', () => {
  beforeEach(() => vi.clearAllMocks())

  it('accepted key (true or no answer) = selection only', () => {
    keyHaptic(true)
    keyHaptic()
    expect(h.selectionAsync).toHaveBeenCalledTimes(2)
    expect(h.notificationAsync).not.toHaveBeenCalled()
  })

  it('rejected key = warning, no selection', () => {
    keyHaptic(false)
    expect(h.notificationAsync).toHaveBeenCalledWith('w')
    expect(h.selectionAsync).not.toHaveBeenCalled()
  })
})
