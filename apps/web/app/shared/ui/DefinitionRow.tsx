// Figma: Web/Definition row 757:301 (Layout = Stacked below 768 px, Row at 768 and up; Font = Text / Mono; Show copy)
import type { ReactNode } from 'react'
import { CopyButton } from './CopyButton'

type Props = {
  label: string
  /** Mono = an address or a hash: one run, wrapped anywhere, never truncated. */
  mono?: boolean
  /** The text to copy; the copy button shows when it is set. */
  copy?: { text: string; label: string; copied: string }
  children: ReactNode
  /** Extra classes on the row (the skeleton's height for a row that renders shorter). */
  className?: string
}

export function DefinitionRow({ label, mono = false, copy, children, className = '' }: Props) {
  return (
    <div className={`tablet:flex-row tablet:gap-6 flex flex-col gap-1 py-3 ${className}`}>
      <dt className="text-product-b-body-small text-text-tertiary tablet:w-definition-label shrink-0">{label}</dt>
      <dd className="flex min-w-px flex-1 items-center gap-2">
        {mono ? (
          <code translate="no" className="text-address-m text-text-primary min-w-px flex-1 break-all">
            {children}
          </code>
        ) : (
          <span className="text-product-b-body text-text-primary min-w-px flex-1">{children}</span>
        )}
        {copy && <CopyButton text={copy.text} label={copy.label} copied={copy.copied} />}
      </dd>
    </div>
  )
}
