import { type WebMessages } from '@vaultme/i18n/web'

// Figma: Web/Icon button 756:94 (theme toggle: auto -> light -> dark)
// Static markup: THEME_SCRIPT (shared/lib/theme.ts) handles the click and keeps aria-label in step with the choice.
export function ThemeToggle({ t }: { t: WebMessages['header'] }) {
  return (
    <button
      type="button"
      data-theme-toggle
      data-label={t.themeLabel}
      data-names={JSON.stringify(t.theme)}
      aria-label={`${t.themeLabel}: ${t.theme.auto}`}
      className="bg-icon-button-bg-default hover:bg-icon-button-bg-hover active:bg-icon-button-bg-pressed text-icon-button-fg rounded-icon-button-radius size-icon-button-hit-target inline-flex shrink-0 cursor-pointer items-center justify-center"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-icon-button-icon-size">
        <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 2.75a7.25 7.25 0 0 1 0 14.5V2.75Z" fill="currentColor" />
      </svg>
    </button>
  )
}
