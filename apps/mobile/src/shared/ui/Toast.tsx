// Figma: B/Toast 736:27406
import { createContext, useContext } from 'react'
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

/** Shows a short message on the nearest Screen. A no-op outside a Screen. */
export const ToastContext = createContext<(message: string) => void>(() => undefined)
export const useToast = () => useContext(ToastContext)

/**
 * Small temporary message on the inverse surface (DESIGN.md: a toast may use the inverse surface).
 * Never carries information needed to judge a transaction. Screen places it 16 above its bottom edge and hides it after a few seconds.
 */
export function Toast({ message }: { message: string }) {
  const t = useTheme()
  const b = t.component.noticeBanner
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ padding: b.padding, borderRadius: b.radius, backgroundColor: t.semantic.surface.inverse }}
    >
      <Text variant="bodySmall" color={t.semantic.text.inverse}>
        {message}
      </Text>
    </View>
  )
}
