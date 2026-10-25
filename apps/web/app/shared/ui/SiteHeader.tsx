// Figma: Web/Header 756:174 (Size = 375 / 768 / 1280)
import { type WebLocale, type WebMessages, webLocales, webMessages } from '@vaultme/i18n/web'
import { Fragment } from 'react'
import { homeOf, viewerPath } from '../lib/locale'
import { BrandMark } from './BrandMark'
import { ButtonLink } from './ButtonLink'
import { StatusChip } from './StatusChip'
import { ThemeToggle } from './ThemeToggle'

// 375: only the other language ("EN"). 768 and up: "KO / EN", the current one as plain text.
function LanguageSwitch({ locale, t }: { locale: WebLocale; t: WebMessages['header'] }) {
  return (
    <nav
      aria-label={t.languageLabel}
      className="text-product-b-headline text-text-primary h-button-b-height-md px-button-b-padding-x-md flex items-center gap-2 whitespace-nowrap"
    >
      {webLocales.map((code, i) => (
        <Fragment key={code}>
          {i > 0 && (
            <span aria-hidden="true" className="tablet:inline hidden">
              /
            </span>
          )}
          {code === locale ? (
            <span aria-current="true" className="tablet:inline hidden">
              {code.toUpperCase()}
            </span>
          ) : (
            <a href={homeOf(code)} lang={code} hrefLang={code}>
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
    <header className="bg-screen-b-bg px-layout-screen-padding tablet:gap-3 tablet:px-8 web-desktop:px-20 h-web-header flex items-center gap-1 py-3">
      <a href={homeOf(locale)} className="flex shrink-0 items-center gap-2" aria-label={t.siteName}>
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
        {t.header.viewer}
      </ButtonLink>
    </header>
  )
}
