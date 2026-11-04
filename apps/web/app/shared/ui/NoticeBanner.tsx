// Figma: B/Notice inline 493:17437 (Tier = Banner, Tone = Info / Warning, with title)
import type { ReactNode } from 'react'

const tones = {
  info: 'bg-status-notice-info-bg text-icon-tertiary',
  warning: 'bg-status-notice-warning-bg text-icon-status-warning',
} as const

export function NoticeBanner({
  tone,
  icon,
  title,
  body,
}: {
  tone: keyof typeof tones
  icon: ReactNode
  title: string
  body: string
}) {
  return (
    <li
      className={`${tones[tone]} rounded-status-notice-radius p-status-notice-padding gap-status-notice-gap flex items-start`}
    >
      {icon}
      <div className="flex min-w-px flex-1 flex-col gap-1">
        <h3 className={`text-product-b-headline ${tone === 'info' ? 'text-text-secondary' : 'text-text-primary'}`}>
          {title}
        </h3>
        <p className="text-product-b-body-small text-text-secondary">{body}</p>
      </div>
    </li>
  )
}
