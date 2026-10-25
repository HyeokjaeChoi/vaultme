// Figma: Web/FAQ item 759:143 (Open = true shows the answer and the collapse chevron)
// A native <details>: it opens and closes without JavaScript (the landing page ships none).
import { IconCollapse, IconExpand } from './icons'

export function FaqItem({ question, answer, open }: { question: string; answer: string; open?: boolean }) {
  return (
    <li>
      <details open={open} className="group">
        <summary className="text-product-b-row-title text-text-primary group-open:pb-2 flex cursor-pointer list-none items-center gap-4 py-4">
          <span className="min-w-px flex-1">{question}</span>
          <IconExpand className="text-icon-action-fg group-open:hidden" />
          <IconCollapse className="text-icon-action-fg hidden group-open:block" />
        </summary>
        <p className="text-product-b-body-small text-text-secondary pb-4">{answer}</p>
      </details>
    </li>
  )
}
