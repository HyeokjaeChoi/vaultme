import { type ReactNode, useEffect, useReducer } from 'react'
import { AppState, View } from 'react-native'
import { isAuthInProgress } from '@/shared/auth'
import { getAccountAddress, getLockSettings, setLockState } from '@/shared/storage'
import { LockPage } from '@/pages/lock'
import { reduceLock } from './lockTimer'

/** A wallet exists on this install. Sync (kv). The Keychain-only case (interrupted creation) comes in as `phraseStored`, read by the root layout before the first render. */
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
export function LockGate({ phraseStored, children }: { phraseStored: boolean; children: ReactNode }) {
  const [lock, dispatch] = useReducer(reduceLock, undefined, () => ({ locked: hasWallet() || phraseStored, backgroundedAt: null }))

  useEffect(() => {
    try {
      setLockState(lock)
    } catch {
      // kv closed: nothing to persist
    }
  }, [lock])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const wallet = hasWallet()
      const authInProgress = isAuthInProgress()
      dispatch({ type: 'appState', next: next === 'active' || next === 'background' ? next : 'inactive', now: Date.now(), wallet, authInProgress, graceSeconds: getLockSettings().graceSeconds })
    })
    return () => sub.remove()
  }, [])

  // The app stays mounted while locked (the root navigator must exist for deep links; the route survives a grace lock) but is not displayed or reachable.
  // App-switcher preview hiding is only for the phrase screens S03/S61 (ux-flow.md section 9, Q43), not here.
  return (
    <>
      <View style={{ flex: 1, display: lock.locked ? 'none' : 'flex' }}>{children}</View>
      {lock.locked ? <LockPage onUnlock={() => dispatch({ type: 'unlock' })} /> : null}
    </>
  )
}
