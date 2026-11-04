// Figma: B/Button 398:247 (Landing "Button App Store에서 받기" 762:243 / "Button Google Play에서 받기" 762:246; plain buttons, no official badges)
import type { ReactNode } from 'react'
import { ButtonLink, type ButtonVariant, buttonClass } from './ButtonLink'

/** A link to the store page when its URL is set; otherwise an inert button (no store listing yet, see shared/lib/stores.ts). */
export function StoreButton({
  href,
  variant,
  className = '',
  describedBy,
  children,
}: {
  href: string | null
  variant: ButtonVariant
  className?: string
  /** The id of the text that says why the button does nothing (shown while `href` is null). */
  describedBy?: string
  children: ReactNode
}) {
  if (href) {
    return (
      <ButtonLink variant={variant} href={href} className={className}>
        {children}
      </ButtonLink>
    )
  }
  return (
    <button
      type="button"
      aria-disabled="true"
      aria-describedby={describedBy}
      className={buttonClass(variant, className)}
    >
      {children}
    </button>
  )
}
