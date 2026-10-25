import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const pages = [
  {
    name: 'ko',
    path: '/',
    lang: 'ko',
    h1: '내 키는내 기기에만 있어요',
    canonical: 'https://vaultme.stack-line.dev/',
    viewer: '/address',
  },
  {
    name: 'en',
    path: '/en/',
    lang: 'en',
    h1: 'Your keysstay on your device',
    canonical: 'https://vaultme.stack-line.dev/en/',
    viewer: '/en/address',
  },
] as const

for (const p of pages) {
  test.describe(`landing ${p.name}`, () => {
    test('is a real 200 with security headers and the page head', async ({ page }) => {
      const res = await page.goto(p.path)
      if (!res) throw new Error('no response')
      expect(res.status()).toBe(200)
      const h = res.headers()
      expect(h['x-robots-tag']).toBe('noindex') // staging build; WEB_ENV=production drops it
      expect(h['content-security-policy']).toMatch(/script-src 'self' 'sha256-[A-Za-z0-9+/=]+'/)
      await expect(page.locator('html')).toHaveAttribute('lang', p.lang)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(p.h1)
      await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', p.canonical)
      const alt = await page
        .locator('link[rel=alternate][hreflang]')
        .evaluateAll((els) => els.map((e) => [e.getAttribute('hreflang'), e.getAttribute('href')].join(' ')))
      expect(alt).toEqual([
        'ko https://vaultme.stack-line.dev/',
        'en https://vaultme.stack-line.dev/en/',
        'x-default https://vaultme.stack-line.dev/',
      ])
      for (const sel of [
        'meta[name=description]',
        'meta[property="og:title"]',
        'meta[property="og:url"]',
        'meta[name="twitter:card"]',
      ]) {
        await expect(page.locator(sel)).toHaveCount(1)
      }
      await expect(page.locator('meta[name=description]')).not.toHaveAttribute('content', '')
    })

    test('ships no app script, has one LCP image and valid JSON-LD', async ({ page }) => {
      const scripts: string[] = []
      page.on('request', (r) => r.resourceType() === 'script' && scripts.push(r.url()))
      const errors: string[] = []
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
      await page.goto(p.path)
      await page.waitForLoadState('networkidle')
      expect(scripts).toEqual([])
      expect(errors).toEqual([])
      await expect(page.locator('script[src]')).toHaveCount(0)
      const img = page.locator('main img')
      await expect(img).toHaveCount(1)
      await expect(img).toHaveAttribute('fetchpriority', 'high')
      await expect(img).toHaveAttribute('width', '320')
      expect(await img.evaluate((e: HTMLImageElement) => e.currentSrc)).toMatch(/hero-mockup-light-.*\.avif$/)
      const ld = await page
        .locator('script[type="application/ld+json"]')
        .evaluateAll((els) => els.map((e) => JSON.parse(e.textContent) as { '@type': string; mainEntity?: unknown[] }))
      expect(ld.map((d) => d['@type'])).toEqual(['WebApplication', 'FAQPage'])
      expect(ld[1]?.mainEntity).toHaveLength(4)
    })

    test('the FAQ works without JavaScript', async ({ browser }) => {
      const ctx = await browser.newContext({ javaScriptEnabled: false })
      const page = await ctx.newPage()
      await page.goto(p.path)
      const items = page.locator('details')
      await expect(items).toHaveCount(4)
      await expect(items.nth(0)).toHaveAttribute('open', '')
      await items.nth(1).locator('summary').click()
      await expect(items.nth(1)).toHaveAttribute('open', '')
      await items.nth(1).locator('summary').press('Enter')
      await expect(items.nth(1)).not.toHaveAttribute('open', '')
      await ctx.close()
    })

    test('links the viewer and the other language', async ({ page }) => {
      await page.goto(p.path)
      await expect(page.getByRole('main').getByRole('link').first()).toHaveAttribute('href', p.viewer)
      await expect(
        page.getByRole('navigation').getByRole('link', { name: p.lang === 'ko' ? 'EN' : 'KO' }),
      ).toBeVisible()
    })

    test('store buttons are inert until real store URLs exist', async ({ page }) => {
      await page.goto(p.path)
      await expect(page.getByRole('main').locator('button[aria-disabled=true]')).toHaveCount(2)
    })

    for (const scheme of ['light', 'dark'] as const) {
      for (const width of [375, 768, 1280]) {
        test(`axe finds no violation (${scheme}, ${String(width)}px)`, async ({ page }) => {
          await page.setViewportSize({ width, height: 900 })
          await page.emulateMedia({ colorScheme: scheme })
          await page.goto(p.path)
          const { violations } = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'])
            .analyze()
          expect(violations).toEqual([])
        })
      }
    }

    for (const width of [375, 768, 1280]) {
      test(`every link, button and FAQ row is at least 44 x 44 px (${String(width)}px)`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(p.path)
        const small = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('a, button, summary')]
            .filter((el) => !el.matches('a[href="#main"]'))
            .flatMap((el) => {
              const { width, height } = el.getBoundingClientRect()
              const name = el.getAttribute('aria-label') ?? el.textContent.trim()
              return width < 44 || height < 44
                ? [`${name}: ${String(Math.round(width))} x ${String(Math.round(height))}`]
                : []
            }),
        )
        expect(small).toEqual([])
      })
    }

    test('no horizontal scroll (375px)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 800 })
      await page.goto(p.path)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    })
  })
}

test('the hero image follows the chosen theme (dark source on a light system)', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  const src = () => page.locator('main img').evaluate((e: HTMLImageElement) => e.currentSrc)
  expect(await src()).toMatch(/light/)
  await page.getByRole('button', { name: /화면 테마/ }).click() // auto -> light
  await page.getByRole('button', { name: /화면 테마/ }).click() // light -> dark
  await expect.poll(src).toMatch(/dark/)
})

test.describe('SEO files', () => {
  test('robots.txt allows crawling and names the sitemap', async ({ request }) => {
    const res = await request.get('/robots.txt')
    expect(res.status()).toBe(200)
    const body = await res.text()
    expect(body).toContain('User-agent: *')
    expect(body).not.toMatch(/^Disallow: \//m)
    expect(body).toContain('Sitemap: https://vaultme.stack-line.dev/sitemap.xml')
  })

  test('sitemap.xml lists ko and en with hreflang pairs', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    expect(res.status()).toBe(200)
    const body = await res.text()
    expect(body.match(/<loc>[^<]+<\/loc>/g)).toEqual([
      '<loc>https://vaultme.stack-line.dev/</loc>',
      '<loc>https://vaultme.stack-line.dev/en/</loc>',
    ])
    expect(body.match(/hreflang="x-default"/g)).toHaveLength(2)
  })
})
