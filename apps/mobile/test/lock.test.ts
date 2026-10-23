import { describe, expect, it, vi } from 'vitest'

vi.mock('expo-local-authentication', () => ({
  SecurityLevel: { NONE: 0, SECRET: 1 },
  getEnrolledLevelAsync: vi.fn(async () => 1),
  authenticateAsync: vi.fn(),
}))

import * as LA from 'expo-local-authentication'
import { authenticate, isAuthInProgress, mapAuthResult } from '@/shared/auth'
import { reduceLock, type LockEvent } from '@/shell/lockTimer'

const T0 = 1_000_000
const ev = (
  next: 'active' | 'inactive' | 'background',
  now: number,
  o: Partial<Extract<LockEvent, { type: 'appState' }>> = {},
): LockEvent => ({
  type: 'appState',
  next,
  now,
  wallet: true,
  authInProgress: false,
  graceSeconds: 30,
  ...o,
})
const run = (events: LockEvent[]) => events.reduce(reduceLock, { locked: false, backgroundedAt: null })

describe('lock timer (Q13)', () => {
  it('stays unlocked when back after 29 s', () => {
    expect(run([ev('background', T0), ev('active', T0 + 29_000)]).locked).toBe(false)
  })
  it('locks when back after 30 s or more', () => {
    expect(run([ev('background', T0), ev('active', T0 + 30_000)]).locked).toBe(true)
    expect(run([ev('inactive', T0), ev('background', T0 + 1), ev('active', T0 + 31_000)]).locked).toBe(true)
  })
  it('inactive alone never starts the timer', () => {
    expect(run([ev('inactive', T0), ev('active', T0 + 90_000)])).toEqual({ locked: false, backgroundedAt: null })
  })
  it('ignores background caused by our own auth dialog', () => {
    expect(run([ev('background', T0, { authInProgress: true }), ev('active', T0 + 90_000)]).locked).toBe(false)
  })
  it('keeps the first background time through inactive/background repeats', () => {
    expect(
      run([ev('background', T0), ev('inactive', T0 + 20_000), ev('background', T0 + 21_000), ev('active', T0 + 31_000)])
        .locked,
    ).toBe(true)
  })
  it('does not lock without a wallet', () => {
    expect(run([ev('background', T0, { wallet: false }), ev('active', T0 + 90_000)]).locked).toBe(false)
  })
  it('locks when the clock went backwards', () => {
    expect(run([ev('background', T0), ev('active', T0 - 5_000)]).locked).toBe(true)
  })
  it('stays locked until unlock', () => {
    const locked = run([ev('background', T0), ev('active', T0 + 40_000)])
    expect(reduceLock(locked, ev('background', T0 + 41_000)).locked).toBe(true)
    expect(reduceLock(locked, { type: 'unlock' })).toEqual({ locked: false, backgroundedAt: null })
  })
  it('uses graceSeconds', () => {
    expect(run([ev('background', T0, { graceSeconds: 5 }), ev('active', T0 + 6_000, { graceSeconds: 5 })]).locked).toBe(
      true,
    )
  })
})

describe('authenticate', () => {
  it('maps results', () => {
    expect(mapAuthResult({ success: true })).toBe('ok')
    for (const error of ['user_cancel', 'system_cancel', 'app_cancel'])
      expect(mapAuthResult({ success: false, error })).toBe('cancelled')
    for (const error of ['not_enrolled', 'passcode_not_set', 'not_available'])
      expect(mapAuthResult({ success: false, error })).toBe('unavailable')
    for (const error of ['lockout', 'authentication_failed', 'timeout', 'unknown'])
      expect(mapAuthResult({ success: false, error })).toBe('error')
  })
  it('asks with passcode fallback and flags the dialog while it is open', async () => {
    let during = false
    vi.mocked(LA.authenticateAsync).mockImplementationOnce(async () => {
      during = isAuthInProgress()
      return { success: true }
    })
    expect(await authenticate('이유')).toBe('ok')
    expect(during).toBe(true)
    expect(isAuthInProgress()).toBe(false)
    expect(LA.authenticateAsync).toHaveBeenCalledWith({
      promptMessage: '이유',
      cancelLabel: '취소',
      disableDeviceFallback: false,
    })
  })
  it('is unavailable with no enrolled security, error when the module throws, and clears the flag', async () => {
    vi.mocked(LA.getEnrolledLevelAsync).mockResolvedValueOnce(0)
    expect(await authenticate('x')).toBe('unavailable')
    vi.mocked(LA.authenticateAsync).mockRejectedValueOnce(new Error('boom'))
    expect(await authenticate('x')).toBe('error')
    expect(isAuthInProgress()).toBe(false)
  })
})
