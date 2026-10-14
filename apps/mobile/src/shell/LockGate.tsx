import { type ReactNode, useEffect, useReducer, useState } from 'react'
import { AppState, Platform, View } from 'react-native'
import { isAuthInProgress } from '@/shared/auth'
import { getAccountAddress, getLockSettings, hasPhrase, setLockState } from '@/shared/storage'
import { useTheme } from '@/shared/theme'
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
  const th = useTheme()
  const [lock, dispatch] = useReducer(reduceLock, undefined, () => ({ locked: hasWallet(), backgroundedAt: null }))
  const [covered, setCovered] = useState(false)

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
      // iOS app switcher: hide the app as soon as it leaves the foreground. Our own auth dialog does not count.
      if (Platform.OS === 'ios') setCovered(next !== 'active' && wallet && !authInProgress)
      dispatch({ type: 'appState', next: next === 'active' || next === 'background' ? next : 'inactive', now: Date.now(), wallet, authInProgress, graceSeconds: getLockSettings().graceSeconds })
    })
    return () => sub.remove()
  }, [])

  if (lock.locked) return <LockPage onUnlock={() => dispatch({ type: 'unlock' })} />
  return (
    <>
      {children}
      {covered ? <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: th.semantic.surface.canvas }} /> : null}
    </>
  )
}
