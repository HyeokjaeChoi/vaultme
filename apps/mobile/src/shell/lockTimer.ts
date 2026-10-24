import type { LockState } from '@/shared/storage'

// Lock after >= graceSeconds in the background. `inactive` is never an exit (it is also the OS auth dialog, the app switcher peek, and iOS's step before background).
export type LockEvent =
  | {
      type: 'appState'
      next: 'active' | 'inactive' | 'background'
      now: number
      wallet: boolean
      authInProgress: boolean
      graceSeconds: number
    }
  | { type: 'unlock' }
  | { type: 'lock' }

export function reduceLock(s: LockState, e: LockEvent): LockState {
  if (e.type === 'unlock') return { locked: false, backgroundedAt: null }
  if (e.type === 'lock') return { ...s, locked: true }
  if (e.next === 'inactive') return s
  if (e.next === 'background') {
    // Auth-dialog background (Android device-credential screen) and no-wallet flows never start the timer.
    if (e.authInProgress || !e.wallet || s.backgroundedAt !== null) return s
    return { ...s, backgroundedAt: e.now }
  }
  if (s.backgroundedAt === null) return s
  const away = e.now - s.backgroundedAt
  // A clock set back (negative) counts as locked.
  return { locked: s.locked || away < 0 || away >= e.graceSeconds * 1000, backgroundedAt: null }
}
