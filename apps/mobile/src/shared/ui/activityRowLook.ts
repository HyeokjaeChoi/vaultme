import type { ActivityStatus } from './ActivityRow'
import type { RowBadgeKind } from './RowBadge'

/** What B/Row looks like for a status and kind (pure, so a test can check it). Caution (Figma State=Caution, Q71): a warning badge and a caution line; a failed row keeps its failed badge. */
export function activityRowLook(r: { status: ActivityStatus; kind: 'send' | 'receive'; caution?: boolean }): {
  badge: RowBadgeKind
  struck: boolean
  amountTone: 'normal' | 'secondary' | 'tertiary'
  showCaution: boolean
} {
  const struck = r.status === 'failed' || r.status === 'replaced'
  const confirmedBadge: RowBadgeKind = r.kind === 'send' ? 'sent' : 'received'
  const badge: RowBadgeKind = r.status === 'confirmed' ? (r.caution ? 'warning' : confirmedBadge) : r.status
  return {
    badge,
    struck,
    amountTone: struck ? 'tertiary' : r.status === 'pending' || r.status === 'unknown' ? 'secondary' : 'normal',
    showCaution: !!r.caution,
  }
}
