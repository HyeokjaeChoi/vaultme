import { webMessages } from '@vaultme/i18n/web'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { webLocales } from '@vaultme/i18n/web'
import { localeOf, otherLocale, viewerPath } from '../shared/lib/locale'
import { jsonLdText, landingJsonLd, pageUrl } from '../shared/lib/seo'
import { STORE_URLS } from '../shared/lib/stores'
import { AppMockup, AppMockupPreload } from '../shared/ui/AppMockup'
import { ButtonLink } from '../shared/ui/ButtonLink'
import { FaqItem } from '../shared/ui/FaqItem'
import { FeatureCard } from '../shared/ui/FeatureCard'
import { IconEye, IconInfo, IconKey, IconSend, IconWarning } from '../shared/ui/icons'
import { NoticeBanner } from '../shared/ui/NoticeBanner'
import { StepItem } from '../shared/ui/StepItem'
import { StoreButton } from '../shared/ui/StoreButton'

// Figma: Landing · 375 / 768 / 1280 · Light + Dark (page "Web", section 762:218; light 762:219 / 762:495 / 762:803)
// Prerendered, no app JS (ADR-0012, ADR-0013): the FAQ is <details>, the theme script is inline.
export const handle = { hydrate: false }

const featureIcons = [<IconKey key="key" />, <IconSend key="send" />, <IconEye key="eye" />]

function Section({
  id,
  title,
  className = '',
  narrow = false,
  children,
}: {
  id: string
  title: string
  className?: string
  narrow?: boolean
  children: ReactNode
}) {
  return (
    <section
      aria-labelledby={id}
      className={`px-layout-screen-padding tablet:px-8 tablet:py-16 web-desktop:px-20 web-desktop:py-20 py-10 ${className}`}
    >
      <div
        className={`mx-auto flex w-full flex-col ${narrow ? 'max-w-layout-web-reading-width gap-6' : 'max-w-layout-content-max-width web-desktop:gap-10 gap-8'}`}
      >
        <h2
          id={id}
          className="text-product-b-title2 tablet:text-product-b-title1 web-desktop:text-product-b-display-m text-text-primary"
        >
          {title}
        </h2>
        {children}
      </div>
    </section>
  )
}

export default function Landing() {
  const locale = localeOf(useLocation().pathname)
  const m = webMessages[locale]
  const t = m.landing
  return (
    <main id="main">
      <title>{t.meta.title}</title>
      <meta name="description" content={t.meta.description} />
      <link rel="canonical" href={pageUrl(locale)} />
      {webLocales.map((code) => (
        <link key={code} rel="alternate" hrefLang={code} href={pageUrl(code)} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={pageUrl('ko')} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={m.siteName} />
      <meta property="og:title" content={t.meta.title} />
      <meta property="og:description" content={t.meta.description} />
      <meta property="og:url" content={pageUrl(locale)} />
      <meta property="og:locale" content={locale === 'en' ? 'en_US' : 'ko_KR'} />
      <meta property="og:locale:alternate" content={otherLocale(locale) === 'en' ? 'en_US' : 'ko_KR'} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={t.meta.title} />
      <meta name="twitter:description" content={t.meta.description} />
      <AppMockupPreload />
      {landingJsonLd(locale).map((data) => (
        <script key={data['@type']} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(data) }} />
      ))}

      <section
        aria-labelledby="hero-title"
        className="px-layout-screen-padding tablet:px-8 tablet:py-16 web-desktop:p-20 py-10"
      >
        <div className="max-w-layout-content-max-width web-desktop:flex-row web-desktop:items-center web-desktop:gap-20 mx-auto flex w-full flex-col gap-8">
          <div className="web-desktop:min-w-px web-desktop:flex-1 flex flex-col items-start gap-6">
            <h1
              id="hero-title"
              className="text-product-b-title1 tablet:text-product-b-display-m web-desktop:text-product-b-display-l text-text-primary"
            >
              {t.hero.title.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h1>
            <p className="text-product-b-body tablet:text-product-b-title3 text-text-secondary">{t.hero.value}</p>
            <div id="get-app" className="tablet:flex-row tablet:flex-wrap flex w-full flex-col gap-3 scroll-mt-6">
              <StoreButton href={STORE_URLS.ios} variant="primary">
                {t.hero.appStore}
              </StoreButton>
              <StoreButton href={STORE_URLS.android} variant="secondary">
                {t.hero.googlePlay}
              </StoreButton>
            </div>
          </div>
          <div className="bg-surface-subtle rounded-card-radius web-desktop:shrink-0 flex justify-center px-6 py-10">
            <AppMockup alt={t.hero.mockupAlt} />
          </div>
        </div>
      </section>

      <Section id="features-title" title={t.features.title}>
        <ul className="web-desktop:grid-cols-3 web-desktop:gap-6 grid gap-4">
          {t.features.items.map((item, i) => (
            <FeatureCard key={item.title} icon={featureIcons[i]} title={item.title} body={item.body} />
          ))}
        </ul>
      </Section>

      <Section id="steps-title" title={t.steps.title} className="bg-surface-subtle">
        <ol className="tablet:grid-cols-3 web-desktop:gap-10 grid gap-6">
          {t.steps.items.map((item, i) => (
            <StepItem key={item.title} number={i + 1} title={item.title} body={item.body} />
          ))}
        </ol>
      </Section>

      <Section id="security-title" title={t.security.title}>
        <ul className="web-desktop:grid-cols-3 grid gap-3">
          {t.security.items.map((item, i) => (
            <NoticeBanner
              key={item.title}
              tone={i === t.security.items.length - 1 ? 'warning' : 'info'}
              icon={i === t.security.items.length - 1 ? <IconWarning /> : <IconInfo />}
              title={item.title}
              body={item.body}
            />
          ))}
        </ul>
      </Section>

      <Section id="faq-title" title={t.faq.title} narrow>
        <ul className="flex w-full flex-col">
          {t.faq.items.map((item, i) => (
            <FaqItem key={item.question} question={item.question} answer={item.answer} open={i === 0} />
          ))}
        </ul>
      </Section>

      <section
        aria-labelledby="closing-title"
        className="bg-surface-subtle px-layout-screen-padding tablet:px-8 tablet:py-16 web-desktop:px-20 web-desktop:py-20 py-10 text-center"
      >
        <div className="max-w-layout-content-max-width web-desktop:gap-10 mx-auto flex w-full flex-col items-center gap-8">
          <h2
            id="closing-title"
            className="text-product-b-title2 tablet:text-product-b-title1 web-desktop:text-product-b-display-m text-text-primary"
          >
            {t.closing.title}
          </h2>
          <p className="text-product-b-body text-text-secondary">{t.closing.body}</p>
          <div className="tablet:flex-row flex w-full flex-col items-center justify-center gap-3">
            <ButtonLink variant="primary" href={viewerPath(locale)} className="tablet:w-auto w-full">
              {t.closing.viewer}
            </ButtonLink>
            <ButtonLink variant="secondary" href="#get-app" className="tablet:w-auto w-full">
              {t.closing.app}
            </ButtonLink>
          </div>
        </div>
      </section>
    </main>
  )
}
