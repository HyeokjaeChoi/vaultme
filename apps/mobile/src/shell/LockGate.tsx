import { type ReactNode, useEffect, useReducer } from 'react'
import { AppState } from 'react-native'
import { isAuthInProgress } from '@/shared/auth'
import { getAccountAddress, getLockSettings, hasPhrase, setLockState } from '@/shared/storage'
import { LockPage } from '@/pages/lock'
import { reduceLock } from './lockTimer'

/** A wallet exists on this install. Sync (kv); the Keychain-only case (interrupted creation) is checked once at boot below. */
function hasWallet(): boolean {
  try {
    return getAccountAddress() !== null
  } catch {
    return false
  }
}

/**
 * Lock gate (Q13, lld.md): with a wallet, the app is replaced by S90 until OS auth succeeds.
 * Cold start is locked; returning after >= 30 s in the background locks; no wallet means no lock.
 * Requires the kv to be open (root layout awaits it), so the first render already knows.
 */
export function LockGate({ children }: { children: ReactNode }) {
  const [lock, dispatch] = useReducer(reduceLock, undefined, () => ({ locked: hasWallet(), backgroundedAt: null }))

  useEffect(() => {
    try {
      setLockState(lock)
    } catch {
      // kv closed: nothing to persist
    }
  }, [lock])

  useEffect(() => {
    if (!hasWallet()) void hasPhrase().then((has) => has && dispatch({ type: 'lock' }), () => undefined)
    const sub = AppState.addEventListener('change', (next) => {
      const wallet = hasWallet()
      const authInProgress = isAuthInProgress()
      dispatch({ type: 'appState', next: next === 'active' || next === 'background' ? next : 'inactive', now: Date.now(), wallet, authInProgress, graceSeconds: getLockSettings().graceSeconds })
    })
    return () => sub.remove()
  }, [])

  // App-switcher preview hiding is only for the phrase screens S03/S61 (ux-flow.md §9, Q43), not here.
  return lock.locked ? <LockPage onUnlock={() => dispatch({ type: 'unlock' })} /> : <>{children}</>
}
