import { useEffect, useRef } from 'react'
import { AccessibilityInfo } from 'react-native'

const GAP_MS = 1500 // a spoken message needs about this long; the next one waits so it does not cut the first
let freeAt = 0

/**
 * Announce `message` once when it becomes a new non-empty message (WCAG 4.1.3; an RN `alert` is not announced on iOS when it mounts).
 * The same message is not repeated while it stays; announcements of several fields are queued, never overlapping.
 */
export function useAnnounce(message: string | undefined): void {
  const last = useRef<string>(undefined)
  useEffect(() => {
    if (!message) {
      last.current = undefined
      return
    }
    if (message === last.current) return
    last.current = message
    const at = Math.max(Date.now(), freeAt)
    freeAt = at + GAP_MS
    const id = setTimeout(() => AccessibilityInfo.announceForAccessibility(message), at - Date.now())
    return () => clearTimeout(id)
  }, [message])
}
