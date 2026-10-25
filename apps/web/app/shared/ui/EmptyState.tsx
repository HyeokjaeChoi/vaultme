// Figma: B/Empty state 422:674 (hero icon, Title 3, Body, one secondary md action; History / Empty state 767:3638, Error state 767:4127)
import type { ReactNode } from 'react'
import { HeroIcon } from './HeroIcon'

type Props = { icon: Parameters<typeof HeroIcon>[0]['name']; title: string; body: string; action: ReactNode }

export function EmptyState({ icon, title, body, action }: Props) {
  return (
    <div className="p-empty-state-padding flex flex-col items-center gap-3 text-center">
      <HeroIcon name={icon} />
      <p className="text-product-b-title3 text-empty-state-title">{title}</p>
      <p className="text-product-b-body text-empty-state-body">{body}</p>
      {action}
    </div>
  )
}
