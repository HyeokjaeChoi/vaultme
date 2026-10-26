import { beforeEach, describe, expect, it, vi } from 'vitest'

// expo-local-authentication SecurityLevel: 0 = no screen lock, 1 = PIN/pattern/passcode, 3 = strong biometric.
vi.mock('expo-local-authentication', () => ({
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_STRONG: 3 },
  getEnrolledLevelAsync: vi.fn(),
}))

// A minimal hook runner: state lives in one cell, effects run at once, the cleanup is kept.
const hooks = vi.hoisted(() => ({ state: null as boolean | null, cleanup: null as null | (() => void) }))
const appState = vi.hoisted(() => ({ handler: null as null | ((s: string) => void), removed: false }))
const launcher = vi.hoisted(() => ({ start: vi.fn() }))
const os = vi.hoisted(() => ({ value: 'android' }))
vi.mock('react', () => ({
  useState: (init: boolean | null) => [hooks.state ?? init, (v: boolean | null) => (hooks.state = v)],
  useCallback: (fn: unknown) => fn,
  useRef: (v: unknown) => ({ current: v }),
  useEffect: (fn: () => (() => void) | undefined) => void (hooks.cleanup = fn() ?? null),
}))
vi.mock('react-native', () => ({
  Platform: {
    get OS() {
      return os.value
    },
  },
  AppState: {
    addEventListener: (_: string, h: (s: string) => void) => {
      appState.handler = h
      return { remove: () => (appState.removed = true) }
    },
  },
}))
vi.mock('expo-intent-launcher', () => ({
  ActivityAction: { SECURITY_SETTINGS: 'android.settings.SECURITY_SETTINGS' },
  startActivityAsync: launcher.start,
}))

import * as LA from 'expo-local-authentication'
import { classifySaveFailure, deviceLockSet } from '@/shared/auth'

beforeEach(() => vi.mocked(LA.getEnrolledLevelAsync).mockReset())

describe('deviceLockSet', () => {
  it('is false only for SecurityLevel.NONE', async () => {
    vi.mocked(LA.getEnrolledLevelAsync).mockResolvedValueOnce(0)
    expect(await deviceLockSet()).toBe(false)
    vi.mocked(LA.getEnrolledLevelAsync).mockResolvedValueOnce(1)
    expect(await deviceLockSet()).toBe(true)
    vi.mocked(LA.getEnrolledLevelAsync).mockResolvedValueOnce(3)
    expect(await deviceLockSet()).toBe(true)
  })
  it('does not block the user when the check itself fails', async () => {
    vi.mocked(LA.getEnrolledLevelAsync).mockRejectedValueOnce(new Error('boom'))
    expect(await deviceLockSet()).toBe(true)
  })
})

describe('classifySaveFailure', () => {
  it('a cancel is cancelled, whatever the lock state (no lock check needed)', async () => {
    expect(await classifySaveFailure(new Error('User canceled the operation.'))).toBe('cancelled')
    expect(LA.getEnrolledLevelAsync).not.toHaveBeenCalled()
  })
  it('another failure with no screen lock is noLock', async () => {
    vi.mocked(LA.getEnrolledLevelAsync).mockResolvedValueOnce(0)
    expect(await classifySaveFailure(new Error('keystore refused'))).toBe('noLock')
  })
  it('another failure with a screen lock is error; a non-Error value too', async () => {
    vi.mocked(LA.getEnrolledLevelAsync).mockResolvedValue(1)
    expect(await classifySaveFailure(new Error('keystore refused'))).toBe('error')
    expect(await classifySaveFailure('x')).toBe('error')
  })
})

describe('useDeviceLock', () => {
  it('asks on mount and on every return to the foreground, and stops on unmount', async () => {
    const { useDeviceLock } = await import('@/shared/lib/useDeviceLock')
    vi.mocked(LA.getEnrolledLevelAsync).mockResolvedValue(0)
    const r = useDeviceLock()
    await vi.waitFor(() => expect(hooks.state).toBe(false))
    vi.mocked(LA.getEnrolledLevelAsync).mockResolvedValue(1)
    appState.handler?.('background')
    appState.handler?.('active')
    await vi.waitFor(() => expect(hooks.state).toBe(true))
    expect(r.canOpenSettings).toBe(true)
    hooks.cleanup?.()
    expect(appState.removed).toBe(true)
  })
  it('an older check that finishes late does not replace the newest answer', async () => {
    const { useDeviceLock } = await import('@/shared/lib/useDeviceLock')
    hooks.state = null
    let slow!: (n: number) => void
    vi.mocked(LA.getEnrolledLevelAsync).mockReturnValueOnce(new Promise<number>((r) => (slow = r)))
    const r = useDeviceLock() // mount check: pending
    vi.mocked(LA.getEnrolledLevelAsync).mockResolvedValueOnce(1)
    await r.refresh() // newer check: lock set
    expect(hooks.state).toBe(true)
    slow(0) // the older check answers last
    await new Promise((res) => setTimeout(res))
    expect(hooks.state).toBe(true)
  })
  it('opens the Android security settings; a failed launch is ignored; iOS has no settings action', async () => {
    const { useDeviceLock } = await import('@/shared/lib/useDeviceLock')
    launcher.start.mockRejectedValueOnce(new Error('no activity'))
    useDeviceLock().openSettings()
    expect(launcher.start).toHaveBeenCalledWith('android.settings.SECURITY_SETTINGS')
    await Promise.resolve()
    os.value = 'ios'
    expect(useDeviceLock().canOpenSettings).toBe(false)
  })
})
