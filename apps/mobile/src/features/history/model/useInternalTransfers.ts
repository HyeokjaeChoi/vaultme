import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'
import { api } from '@/shared/api'
import {
  loadInternal,
  retryAnnouncement,
  shownInternal,
  wantsInternal,
  type Internal,
  type InternalAnswer,
} from './internal'

/**
 * The internal transfers of `hash` (ADR-0015), read apart from the screen's own data: S41 shows the transaction at once and this
 * section has its own loading, list and error. `null` = nothing to read (no hash yet, not a transaction hash, or no API in test-data
 * mode): the section is not drawn. The state belongs to its hash and attempt, so a new hash or a retry shows loading again and a
 * late answer of an older read is dropped. `retry` reads again.
 */
export function useInternalTransfers(hash: string | null): [Internal | null, retry: () => void] {
  const [attempt, setAttempt] = useState(0)
  const [current, setCurrent] = useState<InternalAnswer | null>(null)
  const client = api
  const enabled = hash !== null && wantsInternal(hash) && client !== null

  useEffect(() => {
    if (!enabled) return
    let live = true
    void loadInternal((x) => client.txInternal(x), hash).then((state) => {
      if (!live) return
      setCurrent({ hash, attempt, state })
      // After a retry the button leaves with the error and a mounting view is not announced: say what came back.
      const said = retryAnnouncement(state, attempt)
      if (said) AccessibilityInfo.announceForAccessibility(said)
    })
    return () => {
      live = false
      setCurrent(null) // a re-enabled read (same hash, same attempt) must not show the answer of the run before
    }
  }, [enabled, client, hash, attempt])

  if (!enabled) return [null, () => undefined]
  return [shownInternal(current, hash, attempt), () => setAttempt((n) => n + 1)]
}
