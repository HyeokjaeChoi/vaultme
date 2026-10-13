// Figma: white group frames (Assets 333:258, Date list 342:833, Answers group 336:420, Recent addresses List group 334:366, Address block 342:836); no component node
import type { ReactNode } from 'react'
import { View } from 'react-native'
import { useTheme } from '../theme'

type Props = {
  children: ReactNode
  /** `false` = no white fill (the "Fee and total" group keeps the same inset on the canvas). */
  surface?: boolean
  /** Horizontal inset. `true` (default) = 16 so rows keep paddingX 0; `false` = 0 for rows that bring their own paddingX (List item). */
  inset?: boolean
}

/** One white container (card.group.radius 16, vertical space-1) that holds a whole list of flat rows. Rows have no fill, radius or divider of their own. */
export function Group({ children, surface = true, inset = true }: Props) {
  const t = useTheme()
  return (
    <View
      style={{
        backgroundColor: surface ? t.semantic.surface.default : undefined,
        borderRadius: t.component.card.group.radius,
        paddingHorizontal: inset ? t.component.card.group.padding : 0,
        paddingVertical: t.primitive.space[1],
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  )
}
