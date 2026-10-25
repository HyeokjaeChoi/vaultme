import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { webMessages } from '@vaultme/i18n/web'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import Landing, { handle } from '../app/routes/landing'
import { SITE_ORIGIN, jsonLdText, landingJsonLd, pageUrl } from '../app/shared/lib/seo'
import { StoreButton } from '../app/shared/ui/StoreButton'

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Landing />
    </MemoryRouter>,
  )

describe('landing page', () => {
  it('is static: no hydration', () => {
    expect(handle).toEqual({ hydrate: false })
  })

  it('renders every Korean section from the copy', () => {
    at('/')
    const t = webMessages.ko.landing
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(t.hero.title.join(''))
    const h2 = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(h2).toEqual([t.features.title, t.steps.title, t.security.title, t.faq.title, t.closing.title])
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3 + 3 + 3)
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(9)
  })

  it('renders English copy under /en/', () => {
    at('/en/')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(webMessages.en.landing.hero.title.join(''))
    expect(screen.getByRole('link', { name: 'View an address' })).toHaveAttribute('href', '/en/address')
  })

  it('has one LCP image: sized, high priority, with alt text and an avif source', () => {
    const { container } = at('/')
    const imgs = container.querySelectorAll('img')
    expect(imgs).toHaveLength(1)
    const img = imgs[0]
    expect(img).toHaveAttribute('width', '320')
    expect(img).toHaveAttribute('height', '568')
    expect(img).toHaveAttribute('fetchpriority', 'high')
    expect(img).toHaveAttribute('alt', webMessages.ko.landing.hero.mockupAlt)
    expect(container.querySelectorAll('source[type="image/avif"]').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('img[fetchpriority]')).toHaveLength(1)
  })

  it('FAQ is native <details>: the first answer is open, all answers are in the markup', () => {
    const { container } = at('/')
    const details = container.querySelectorAll('details')
    expect(details).toHaveLength(4)
    expect(details[0]).toHaveAttribute('open')
    expect(details[1]).not.toHaveAttribute('open')
    for (const item of webMessages.ko.landing.faq.items) {
      expect(within(container).getByText(item.answer)).toBeInTheDocument()
    }
  })

  it('has no store link until real store URLs exist, and the buttons are not links to fake pages', () => {
    at('/')
    const t = webMessages.ko.landing.hero
    for (const name of [t.appStore, t.googlePlay]) {
      const btn = screen.getByRole('button', { name })
      expect(btn).toHaveAttribute('aria-disabled', 'true')
    }
    expect(screen.getByRole('link', { name: webMessages.ko.landing.closing.app })).toHaveAttribute('href', '#get-app')
  })

  it('links the viewer CTA to /address (the viewer is a later ticket)', () => {
    at('/')
    expect(screen.getByRole('link', { name: webMessages.ko.landing.closing.viewer })).toHaveAttribute(
      'href',
      '/address',
    )
  })

  it('shows the testnet and no-recovery-phrase notes', () => {
    at('/')
    const t = webMessages.ko.landing
    expect(screen.getByText(t.security.items[2].body)).toBeInTheDocument()
    expect(screen.getByText(t.security.items[1].body)).toBeInTheDocument()
  })
})

describe('landing SEO data', () => {
  it('builds canonical page URLs per locale', () => {
    expect(pageUrl('ko')).toBe(`${SITE_ORIGIN}/`)
    expect(pageUrl('en')).toBe(`${SITE_ORIGIN}/en/`)
  })

  it('WebApplication and FAQPage JSON-LD match the copy', () => {
    for (const locale of ['ko', 'en'] as const) {
      const [app, faq] = landingJsonLd(locale)
      const t = webMessages[locale].landing
      expect(app).toMatchObject({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'VaultMe',
        url: pageUrl(locale),
        inLanguage: locale,
        description: t.meta.description,
      })
      expect(faq).toMatchObject({ '@type': 'FAQPage', inLanguage: locale })
      expect(faq.mainEntity).toEqual(
        t.faq.items.map((i) => ({
          '@type': 'Question',
          name: i.question,
          acceptedAnswer: { '@type': 'Answer', text: i.answer },
        })),
      )
    }
  })
})

describe('jsonLdText', () => {
  it('escapes < so no text can close the script tag', () => {
    expect(jsonLdText({ a: '</script><b>' })).toBe('{"a":"\\u003c/script>\\u003cb>"}')
  })
})

describe('sitemap.xml and robots.txt', () => {
  const read = (f: string) => readFileSync(join(process.cwd(), 'public', f), 'utf8')

  it('sitemap lists exactly the prerendered pages, each with the full hreflang set', () => {
    const xml = read('sitemap.xml')
    expect([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])).toEqual([pageUrl('ko'), pageUrl('en')])
    const pairs: [string, string][] = [
      ['ko', pageUrl('ko')],
      ['en', pageUrl('en')],
      ['x-default', pageUrl('ko')],
    ]
    for (const [lang, url] of pairs) {
      expect(xml.split(`hreflang="${lang}" href="${url}"`).length - 1).toBe(2)
    }
  })

  it('robots.txt allows crawling (staging is noindex by header) and names the sitemap', () => {
    const txt = read('robots.txt')
    expect(txt).not.toMatch(/^Disallow:/m)
    expect(txt).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`)
  })
})

describe('StoreButton', () => {
  it('is a link when the store URL is set', () => {
    render(
      <StoreButton href="https://example.com/app" variant="primary">
        Get
      </StoreButton>,
    )
    expect(screen.getByRole('link', { name: 'Get' })).toHaveAttribute('href', 'https://example.com/app')
  })
})
