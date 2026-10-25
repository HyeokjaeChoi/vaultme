import { type WebLocale, webMessages } from '@vaultme/i18n/web'
import { webLanding } from '@vaultme/i18n/web-landing'
import { homeOf } from './locale'

/** Canonical origin (ADR-0012). Staging pages also name it: they are noindex, so staging is never indexed under it. */
export const SITE_ORIGIN = 'https://vaultme.stack-line.dev'

export const pageUrl = (locale: WebLocale) => `${SITE_ORIGIN}${homeOf(locale)}`

/** WebApplication + FAQPage (schema.org). The FAQ text is the visible FAQ copy, as Google requires. */
export function landingJsonLd(locale: WebLocale) {
  const m = webMessages[locale]
  const t = webLanding[locale].landing
  const url = pageUrl(locale)
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: m.siteName,
      url,
      description: t.meta.description,
      inLanguage: locale,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      url,
      inLanguage: locale,
      mainEntity: t.faq.items.map((i) => ({
        '@type': 'Question',
        name: i.question,
        acceptedAnswer: { '@type': 'Answer', text: i.answer },
      })),
    },
  ] as const
}

/** JSON for an inline <script type="application/ld+json">: `<` is escaped so no text can close the tag. */
export const jsonLdText = (data: unknown) => JSON.stringify(data).replaceAll('<', '\\u003c')
