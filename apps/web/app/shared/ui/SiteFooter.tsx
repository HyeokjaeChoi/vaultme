// Figma: Web/Footer 756:234 (Size = 375 / 768 / 1280)
import { type WebLocale, webMessages } from '@vaultme/i18n/web'
import { homeOf, viewerPath } from '../lib/locale'
import { BrandMark } from './BrandMark'
import { ButtonLink } from './ButtonLink'

export function SiteFooter({ locale }: { locale: WebLocale }) {
  const t = webMessages[locale]
  return (
    <footer className="bg-surface-subtle px-layout-screen-padding tablet:px-8 web-desktop:px-20 flex flex-col gap-6 py-10">
      <div className="tablet:flex-row tablet:items-center flex flex-col items-start gap-6">
        <div className="flex min-w-px flex-1 flex-col gap-2">
          <a href={homeOf(locale)} className="-m-3 flex items-center gap-2 self-start p-3">
            <BrandMark />
            <span translate="no" className="text-product-b-headline text-text-primary">
              {t.siteName}
            </span>
          </a>
          <p className="text-product-b-body-small text-text-secondary">{t.footer.testnetOnly}</p>
        </div>
        <ButtonLink variant="footer" href={viewerPath(locale)}>
          {t.footer.viewer}
        </ButtonLink>
      </div>
      <p className="text-product-b-caption text-text-tertiary">{t.footer.readOnly}</p>
    </footer>
  )
}
