// Figma: Review footer 73:141 (State=Ready)
import type { ReactNode } from 'react'
import { View } from 'react-native'
import { useTheme } from '../theme'

/** C16 Review footer: white decision region with a top border and gap reviewFooter.gap. Children are the decision Buttons (primary first). */
export function ReviewFooter({ children }: { children: ReactNode }) {
  const t = useTheme()
  const c = t.component.reviewFooter
  return (
    <View style={{ gap: c.gap, backgroundColor: c.bg, borderTopWidth: c.borderWidth, borderTopColor: c.border }}>{children}</View>
  )
}
