import { type ReactNode, useEffect } from 'react'
import { AppState, View } from 'react-native'
import { appStore, hasWallet, useAppStore } from '@/shared/app-store'
import { isAuthInProgress } from '@/shared/auth'
import { LockPage } from '@/pages/lock'

/**
 * Lock gate (ARCHITECTURE.md#invariants): with a wallet, the app is replaced by S90 until OS auth succeeds.
 * Cold start is locked; returning after >= 30 s in the background locks; no wallet means no lock.
 * The state lives in the app store (`reduceLock` inside it), which the root layout hydrated before the first render.
 */
export function LockGate({ children }: { children: ReactNode }) {
  const locked = useAppStore((s) => s.lock.locked)

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const { dispatchLock, graceSeconds } = appStore().getState()
      dispatchLock({
        type: 'appState',
        next: next === 'active' || next === 'background' ? next : 'inactive',
        now: Date.now(),
        wallet: hasWallet(),
        authInProgress: isAuthInProgress(),
        graceSeconds,
      })
    })
    return () => sub.remove()
  }, [])

  // The app stays mounted while locked (the root navigator must exist for deep links; the route survives a grace lock) but is not displayed or reachable.
  // App-switcher preview hiding is only for the phrase screens S03/S61, not here.
  return (
    <>
      <View style={{ flex: 1, display: locked ? 'none' : 'flex' }}>{children}</View>
      {locked ? <LockPage onUnlock={() => appStore().getState().dispatchLock({ type: 'unlock' })} /> : null}
    </>
  )
}
