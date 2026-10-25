// Figma: B/Notice 399:102 (Tier=Inline, Tone=Info) and 493:17437 / 493:17451 (Tier=Banner, Tone=Info / Danger)
import type { ReactNode } from 'react'
import { Icon } from './Icon'

type Props = {
  tone: 'info' | 'danger'
  tier: 'inline' | 'banner'
  title?: string
  children: ReactNode
  /** The banner's link slot (B/Notice `showLink`), for example a retry button. */
  action?: ReactNode
  /** `alert` for a failure the user did not ask about (WCAG 4.1.3). */
  role?: 'alert' | 'status'
}

const box = {
  inline: 'px-row-b-padding-x py-2',
  banner: 'p-notice-banner-padding rounded-notice-banner-radius',
}
const bg = { info: 'bg-notice-banner-info-bg', danger: 'bg-notice-banner-danger-bg' }

export function Notice({ tone, tier, title, children, action, role }: Props) {
  return (
    <div
      role={role}
      className={`gap-status-notice-gap flex items-start ${box[tier]} ${tier === 'banner' ? bg[tone] : ''}`}
    >
      <Icon
        name={tone === 'danger' ? 'failed' : 'info'}
        className={tone === 'danger' ? 'text-status-danger-fg' : 'text-text-tertiary'}
      />
      <div className="flex min-w-px flex-1 flex-col items-start gap-1">
        {title && (
          <p className={`text-product-b-headline ${tone === 'danger' ? 'text-text-primary' : 'text-text-secondary'}`}>
            {title}
          </p>
        )}
        <p className="text-product-b-body-small text-text-secondary">{children}</p>
        {action}
      </div>
    </div>
  )
}

/** The link-styled action in a banner (B/Notice link: Label medium, underlined). 44px target through padding. */
export function NoticeAction({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-product-b-link text-text-link -m-3 cursor-pointer p-3 underline"
    >
      {children}
    </button>
  )
}
