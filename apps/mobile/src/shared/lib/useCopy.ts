import * as Clipboard from 'expo-clipboard'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AccessibilityInfo } from 'react-native'
import { haptic } from './haptics'

const COPIED_MS = 1500

/**
 * Copy feedback (Figma State=Copied): copy `text`, impactLight haptic, screen reader announcement, then `copied` is true for 1.5 s.
 * One hook for every copy button (Receive, account block, USDC contract, S06) and the faucet row. A failed clipboard write gives no feedback.
 */
export function useCopy(announce: string, initial = false) {
  const [copied, setCopied] = useState(initial) // `initial` is for __DEV__ design captures only
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const copy = useCallback(
    async (text: string) => {
      try {
        await Clipboard.setStringAsync(text)
      } catch {
        return false // clipboard unavailable: nothing to confirm
      }
      haptic.copy()
      AccessibilityInfo.announceForAccessibility(announce)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), COPIED_MS)
      return true
    },
    [announce],
  )
  return { copied, copy }
}
