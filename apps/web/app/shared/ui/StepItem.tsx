// Figma: Web/Step item 759:138 (number badge 40 px, title, body)
export function StepItem({ number, title, body }: { number: number; title: string; body: string }) {
  return (
    <li className="flex flex-col items-start gap-3">
      <span
        aria-hidden="true"
        className="bg-action-primary-bg-default text-text-on-brand text-product-b-label rounded-pill size-pill-sm flex shrink-0 items-center justify-center"
      >
        {number}
      </span>
      <h3 className="text-product-b-headline text-text-primary">{title}</h3>
      <p className="text-product-b-body-small text-text-secondary">{body}</p>
    </li>
  )
}
