// Figma: Web/Icon button 756:94 (theme toggle: auto -> light -> dark; the Figma glyph is a hand-drawn half circle, audit P3-11 swaps it for Solar sun/moon)
import { type WebMessages } from '@vaultme/i18n/web'
import { pressTransition } from './ButtonLink'

// Static markup: THEME_SCRIPT (shared/lib/theme.ts) handles the click and keeps aria-label in step with the choice.
export function ThemeToggle({ t }: { t: WebMessages['header'] }) {
  return (
    <button
      type="button"
      data-theme-toggle
      data-label={t.themeLabel}
      data-names={JSON.stringify(t.theme)}
      aria-label={`${t.themeLabel}: ${t.theme.auto}`}
      className={`${pressTransition} bg-icon-button-bg-default hover:bg-icon-button-bg-hover active:bg-icon-button-bg-pressed text-icon-button-fg rounded-icon-button-radius size-icon-button-hit-target inline-flex shrink-0 cursor-pointer items-center justify-center`}
    >
      {/* Solar Sun 2 / Moon (Linear): the icon shows the theme on screen now (auto follows the system, via tokens.css). */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-icon-button-icon-size theme-icon-sun"
      >
        <circle cx="12" cy="12" r="5" />
        <path d="M12 2V4M12 20V22M4 12H2M22 12H20M19.7778 4.22266L17.5558 6.25424M4.22217 4.22266L6.44418 6.25424M6.44434 17.5557L4.22211 19.7779M19.7778 19.7773L17.5558 17.5551" />
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-icon-button-icon-size theme-icon-moon"
      >
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 11.5373 21.3065 11.4608 21.0672 11.8568C19.9289 13.7406 17.8615 15 15.5 15C11.9101 15 9 12.0899 9 8.5C9 6.13845 10.2594 4.07105 12.1432 2.93276C12.5392 2.69347 12.4627 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
      </svg>
    </button>
  )
}
