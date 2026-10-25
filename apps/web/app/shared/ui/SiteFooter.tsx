// Figma: Web/Footer 756:234 (Size = 375 / 768 / 1280)
import { type WebLocale, webMessages } from '@vaultme/i18n/web'
import { homeOf, viewerPath } from '../lib/locale'
import { BrandMark } from './BrandMark'
import { ButtonLink } from './ButtonLink'

export function SiteFooter({ locale }: { locale: WebLocale }) {
  const t = webMessages[locale]
  return (
    <footer className="bg-surface-subtle px-layout-screen-padding tablet:px-8 web-desktop:px-20 py-10">
      <div className="max-w-layout-content-max-width tablet:flex-row tablet:items-center tablet:justify-between mx-auto flex w-full flex-col items-start gap-6">
        <a href={homeOf(locale)} className="-m-3 flex items-center gap-2 p-3">
          <BrandMark />
          <span translate="no" className="text-product-b-headline text-text-primary">
            {t.siteName}
          </span>
        </a>
        <ButtonLink variant="secondaryMd" href={viewerPath(locale)}>
          {t.footer.viewer}
        </ButtonLink>
      </div>
    </footer>
  )
}
