// Figma: B/Row badge 495:358 (Kind=Sent / Received / Pending / Failed; 494:326 Confirmed, 494:331 Unknown, 494:336 Replaced; Info)
import { View } from 'react-native'
import { useTheme } from '../theme'
import { Icon, type BoldIconName } from './Icon'

export type RowBadgeKind = 'sent' | 'received' | 'pending' | 'failed' | 'confirmed' | 'unknown' | 'replaced' | 'info'
const GLYPH: Record<RowBadgeKind, BoldIconName> = { sent: 'sent', received: 'received', pending: 'pending', failed: 'failed', confirmed: 'confirmed', unknown: 'unknown', replaced: 'replaced', info: 'info' }

/** Status badge that sits on the bottom-right of an asset logo: Solar Bold circle glyph (15 pt inside 18 pt) with a 2 pt ring in the surface color. The glyph alone says the kind; a word always sits next to it. */
export function RowBadge({ kind }: { kind: RowBadgeKind }) {
  const t = useTheme()
  const b = t.component.rowBadge
  const s = t.semantic.status
  const fg = kind === 'sent' ? b.sent.fg : kind === 'received' ? b.received.fg : kind === 'pending' ? b.pending.fg : kind === 'failed' ? b.failed.fg : kind === 'confirmed' ? s.success.fg : kind === 'info' ? s.info.fg : kind === 'unknown' ? s.unknown.fg : b.sent.fg
  const outer = b.size + b.ring * 2
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ width: outer, height: outer, borderRadius: t.primitive.radius.pill, backgroundColor: b.ringColor, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name={GLYPH[kind]} weight="bold" size={b.size} color={fg} />
    </View>
  )
}
