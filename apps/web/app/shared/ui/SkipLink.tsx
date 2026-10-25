// Figma: none. A link that shows only on keyboard focus (WCAG 2.4.1); section "Focus & a11y" 769:6082 has no frame for it.
import { type WebMessages } from '@vaultme/i18n/web'

export function SkipLink({ t }: { t: WebMessages['header'] }) {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:bg-surface-default focus:text-text-primary focus:text-product-b-headline focus:rounded-button-b-radius focus:left-layout-screen-padding focus:top-3 focus:z-10 focus:absolute focus:px-4 focus:py-3"
    >
      {t.skip}
    </a>
  )
}
