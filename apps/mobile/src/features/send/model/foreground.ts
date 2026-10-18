import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { createForegroundTrigger } from './foregroundTrigger'

/**
 * Runs `callback` when the app comes back to the foreground while `enabled`. Used where the user leaves the app to fix the screen's blocker
 * (the ETH-short state: "테스트 ETH 받기" opens the faucet in the browser) and no screen action can re-read the balance.
 */
export function useOnForeground(callback: () => void, enabled: boolean): void {
  const cb = useRef(callback)
  // Updated after commit, so the listener never calls a callback from a render React discarded.
  useEffect(() => {
    cb.current = callback
  })
  useEffect(() => {
    if (!enabled) return
    const trigger = createForegroundTrigger(() => cb.current(), AppState.currentState)
    const sub = AppState.addEventListener('change', trigger)
    return () => sub.remove()
  }, [enabled])
}
