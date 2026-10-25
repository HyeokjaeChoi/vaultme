// Figma: Web/Feature card 759:131 (icon wrap 48 px on surface/brandTint, title, body)
import type { ReactNode } from 'react'

export function FeatureCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <li className="bg-surface-subtle rounded-card-radius p-card-padding-mobile flex flex-col items-start gap-4">
      <span className="bg-surface-brand-tint text-icon-action-fg rounded-pill size-pill-md flex shrink-0 items-center justify-center">
        {icon}
      </span>
      <h3 className="text-product-b-title3 text-text-primary">{title}</h3>
      <p className="text-product-b-body-small text-text-secondary">{body}</p>
    </li>
  )
}
