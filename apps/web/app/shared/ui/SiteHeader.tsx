// Figma: Web/Header 756:174 (Size = 375 / 768 / 1280)
import { type WebLocale, type WebMessages, webLocales, webMessages } from '@vaultme/i18n/web'
import { Fragment } from 'react'
import { homeOf, viewerPath } from '../lib/locale'
import { BrandMark } from './BrandMark'
import { ButtonLink } from './ButtonLink'
import { StatusChip } from './StatusChip'
import { ThemeToggle } from './ThemeToggle'

// 375: only the other language ("EN"). 768 and up: "KO / EN", the current one as plain text.
// Every link is at least 48 px high and 44 px wide (touch-min); the padding adds up to the Figma spacing.
const item = 'h-button-b-height-md min-w-touch-min tablet:px-2 items-center justify-center'
function LanguageSwitch({ locale, t }: { locale: WebLocale; t: WebMessages['header'] }) {
  return (
    <nav
      aria-label={t.languageLabel}
      className="text-product-b-headline text-text-primary tablet:px-3 flex items-center whitespace-nowrap"
    >
      {webLocales.map((code, i) => (
        <Fragment key={code}>
          {i > 0 && (
            <span aria-hidden="true" className="tablet:inline hidden">
              /
            </span>
          )}
          {code === locale ? (
            <span aria-current="true" className={`${item} tablet:inline-flex hidden`}>
              {code.toUpperCase()}
            </span>
          ) : (
            <a
              href={homeOf(code)}
              lang={code}
              hrefLang={code}
              className={`${item} px-button-b-padding-x-md inline-flex`}
            >
              {code.toUpperCase()}
            </a>
          )}
        </Fragment>
      ))}
    </nav>
  )
}

export function SiteHeader({ locale }: { locale: WebLocale }) {
  const t = webMessages[locale]
  return (
    <header className="bg-screen-b-bg px-layout-screen-padding tablet:gap-3 tablet:px-8 web-desktop:px-20 h-web-header-height flex items-center gap-1 py-3">
      <a href={homeOf(locale)} className="-m-3 flex shrink-0 items-center gap-2 p-3" aria-label={t.siteName}>
        <BrandMark />
        <span translate="no" className="text-product-b-headline text-text-primary tablet:inline hidden">
          {t.siteName}
        </span>
      </a>
      <StatusChip>{t.header.network}</StatusChip>
      <div className="min-w-px flex-1" />
      <ThemeToggle t={t.header} />
      <LanguageSwitch locale={locale} t={t.header} />
      <ButtonLink variant="ghost" href={viewerPath(locale)}>
        {/* The English label does not fit next to the chip at 375 px (Figma has no English frames): use the short one there. */}
        <span className="tablet:hidden">{t.header.viewerShort}</span>
        <span className="tablet:inline hidden">{t.header.viewer}</span>
      </ButtonLink>
    </header>
  )
}
