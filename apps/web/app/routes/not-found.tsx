import { webMessages } from '@vaultme/i18n/web'
import { useLocation } from 'react-router'
import { localeOf, homeOf, viewerPath } from '../shared/lib/locale'
import { ButtonLink } from '../shared/ui/ButtonLink'

// Figma: 404 · 375 / 768 / 1280 · Light + Dark (page "Web", section 769:5827)
export const handle = { hydrate: false }

export function meta() {
  // ko and en pages share this module, so the title is set in <NotFound> through React 19 metadata hoisting.
  return [{ name: 'robots', content: 'noindex' }]
}

export default function NotFound() {
  const locale = localeOf(useLocation().pathname)
  const t = webMessages[locale].notFound
  return (
    <main className="px-layout-screen-padding tablet:px-8 tablet:py-20 web-desktop:px-20 web-desktop:py-24 flex flex-col items-center py-16">
      <title>{`${t.title} · ${webMessages[locale].siteName}`}</title>
      <div className="max-w-web-narrow flex w-full flex-col items-center gap-6 text-center">
        <p className="text-product-b-display-l text-text-tertiary">{t.code}</p>
        <h1 className="text-balance text-product-b-title2 tablet:text-product-b-title1 web-desktop:text-product-b-display-m text-text-primary">
          {t.title}
        </h1>
        <p className="text-product-b-body text-text-secondary">{t.help}</p>
        <div className="tablet:flex-row flex w-full flex-col items-center justify-center gap-3">
          <ButtonLink variant="primary" href={viewerPath(locale)} className="tablet:w-auto w-full">
            {t.viewer}
          </ButtonLink>
          <ButtonLink variant="secondary" href={homeOf(locale)} className="tablet:w-auto w-full">
            {t.home}
          </ButtonLink>
        </div>
      </div>
    </main>
  )
}
