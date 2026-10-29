import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { chain } from '@/shared/chain'
import { type PendingTx } from '@/shared/storage'
import { sendFrom } from './useReviewCore'
import { checkTx, isPolled, startPolling, type TxState } from './txState'
import { readPendingTx, writePendingTx } from '@/entities/transaction'
import { usePendingTx } from './usePendingTx'

/** ARCHITECTURE.md#send: re-check a Pending or Included send every 15 s while its screen is focused. */
export const POLL_MS = 15_000
/** Test-data mode polls faster, so a fake send is seen settling (fakeSettle). */
export const FAKE_POLL_MS = 3_000

/** Re-reads the kv record and checks it against the chain. Returns the new state, or null when there was nothing to check. Throws when the network could not be asked. */
export async function checkStored(): Promise<TxState | null> {
  const cur = readPendingTx()
  if (cur === 'corrupt' || cur === null) return null
  const next = await checkTx(cur, chain, sendFrom(), Date.now)
  // A new send may have replaced the record while the chain was asked: never write an old tx over it.
  const latest = readPendingTx()
  if (latest === 'corrupt' || latest?.hash !== cur.hash) return null
  writePendingTx(next)
  return next.state
}

/** Whether a check moved the stored send to a new state (`prev` = the record read before the check). */
export const stateChanged = (prev: PendingTx | 'corrupt' | null, next: TxState | null): boolean =>
  next !== null && prev !== null && prev !== 'corrupt' && prev.state !== next

/**
 * The pending send for S23/S41, Home and the send gates, with its re-check: `recheck` is the manual button; while the screen is focused and the app is
 * active, a Pending or Included send is re-checked on its own. `error` = the last check could not reach the network. `onStateChange` runs when a check
 * moves the send to a new state.
 */
export function useTrackedTx(onStateChange?: () => void): {
  tx: PendingTx | null
  blocked: boolean
  checking: boolean
  error: unknown
  recheck: () => Promise<void>
} {
  const { tx, blocked, reload } = usePendingTx()
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [active, setActive] = useState(AppState.currentState === 'active')
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'))
    return () => sub.remove()
  }, [])

  const run = useCallback(async () => {
    try {
      const prev = readPendingTx()
      const s = await checkStored()
      setError(null)
      // Home's list merges the local record at load time, so it shows "보내는 중" until it loads again (#269).
      if (stateChanged(prev, s)) onStateChange?.()
      return s
    } catch (e) {
      setError(e)
      throw e
    } finally {
      reload()
    }
  }, [reload, onStateChange])

  const recheck = useCallback(async () => {
    setChecking(true)
    try {
      await run()
    } catch {
      // `error` carries it
    } finally {
      setChecking(false)
    }
  }, [run])

  const polled = tx !== null && isPolled(tx.state)
  useFocusEffect(
    useCallback(() => {
      if (!active || !polled) return undefined
      return startPolling(run, chain.broadcasts ? POLL_MS : FAKE_POLL_MS)
    }, [active, polled, run]),
  )
  return { tx, blocked, checking, error, recheck }
}
