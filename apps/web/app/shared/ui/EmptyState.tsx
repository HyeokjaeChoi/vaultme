// Figma: B/Empty state 422:674 (hero icon, Title 3, Body, one secondary md action; History / Empty state 767:3638, Error state 767:4127)
import type { ReactElement, ReactNode } from 'react'
import { HeroIcon } from './HeroIcon'

/** `icon`: a hero name, or the element to draw instead (the transaction page's invalid-hash state). */
type Props = {
  icon: Parameters<typeof HeroIcon>[0]['name'] | ReactElement
  title: string
  body: string
  action: ReactNode
}

export function EmptyState({ icon, title, body, action }: Props) {
  return (
    <div className="p-empty-state-padding flex flex-col items-center gap-3 text-center">
      {typeof icon === 'string' ? <HeroIcon name={icon} /> : icon}
      <p className="text-product-b-title3 text-empty-state-title">{title}</p>
      <p className="text-product-b-body text-empty-state-body">{body}</p>
      {action}
    </div>
  )
}
