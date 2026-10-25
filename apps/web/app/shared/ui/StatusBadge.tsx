// Figma: Web/Status badge 763:4051 (tone Confirmed / Failed; icon + text label on a tinted pill, never color alone)
import { RowBadge } from './RowBadge'

const tone = {
  confirmed: 'bg-badge-success-bg text-badge-success-fg',
  failed: 'bg-badge-danger-bg text-badge-danger-fg',
} as const

export function StatusBadge({ kind, label }: { kind: keyof typeof tone; label: string }) {
  return (
    <span
      className={`${tone[kind]} text-product-b-label rounded-badge-radius px-badge-padding-x inline-flex items-center gap-2 py-2 whitespace-nowrap`}
    >
      <RowBadge kind={kind} />
      {label}
    </span>
  )
}
