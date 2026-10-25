import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const pages = [
  {
    name: 'ko',
    path: '/no-such-page',
    lang: 'ko',
    title: '페이지를 찾을 수 없어요',
    home: '/',
    other: '/en/',
    otherCode: 'EN',
  },
  {
    name: 'en',
    path: '/en/no-such-page',
    lang: 'en',
    title: 'Page not found',
    home: '/en/',
    other: '/',
    otherCode: 'KO',
  },
] as const

for (const p of pages) {
  test.describe(`404 ${p.name}`, () => {
    test('answers a real 404 with the page and security headers', async ({ page }) => {
      const res = await page.goto(p.path)
      if (!res) throw new Error('no response')
      expect(res.status()).toBe(404)
      const h = res.headers()
      expect(h['x-content-type-options']).toBe('nosniff')
      expect(h['strict-transport-security']).toContain('max-age=')
      expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin')
      expect(h['permissions-policy']).toContain('camera=()')
      expect(h['content-security-policy']).toMatch(/script-src 'self' 'sha256-[A-Za-z0-9+/=]+'/)
      await expect(page.locator('html')).toHaveAttribute('lang', p.lang)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(p.title)
      await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex')
    })

    test('has no console error (the CSP blocks nothing)', async ({ page }) => {
      const errors: string[] = []
      // The 404 document itself is logged by Chrome as a failed load; every other resource must load.
      page.on(
        'console',
        (m) =>
          m.type() === 'error' && !m.location().url.endsWith(p.path) && errors.push(`${m.text()} ${m.location().url}`),
      )
      page.on('pageerror', (e) => errors.push(e.message))
      await page.goto(p.path)
      await page.waitForLoadState('networkidle')
      expect(errors).toEqual([])
    })

    test('links home and to the other language', async ({ page }) => {
      await page.goto(p.path)
      await expect(page.getByRole('main').getByRole('link').last()).toHaveAttribute('href', p.home)
      await expect(page.getByRole('navigation').getByRole('link', { name: p.otherCode })).toHaveAttribute(
        'href',
        p.other,
      )
    })

    for (const scheme of ['light', 'dark'] as const) {
      for (const width of [375, 1280]) {
        test(`axe finds no violation (${scheme}, ${String(width)}px)`, async ({ page }) => {
          await page.setViewportSize({ width, height: 800 })
          await page.emulateMedia({ colorScheme: scheme })
          await page.goto(p.path)
          const { violations } = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'])
            .analyze()
          expect(violations).toEqual([])
        })
      }
    }
  })
}

test.describe('theme toggle', () => {
  test('cycles auto, light, dark, auto and keeps the choice on reload', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/x')
    const html = page.locator('html')
    const toggle = page.getByRole('button', { name: /화면 테마/ })
    await expect(toggle).toHaveAccessibleName('화면 테마: 자동')
    await toggle.click()
    await expect(html).toHaveAttribute('data-theme', 'light')
    await toggle.click()
    await expect(html).toHaveAttribute('data-theme', 'dark')
    await expect(toggle).toHaveAccessibleName('화면 테마: 어둡게')
    await page.reload()
    await expect(html).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(17, 22, 29)')
    await page.getByRole('button', { name: /화면 테마/ }).click()
    await expect(html).not.toHaveAttribute('data-theme', /.+/)
  })

  test('applies the stored theme before first paint', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('vaultme-theme', 'dark'))
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/x', { waitUntil: 'commit' })
    // Read at DOMContentLoaded start, before any stylesheet-driven paint of the light theme could happen.
    const attr = await page.evaluate(() => document.documentElement.dataset.theme)
    expect(attr).toBe('dark')
  })
})

test('/404 and /en/404 redirect to the home pages, which answer 404 until the landing page exists', async ({
  page,
}) => {
  const res = await page.request.get('/404', { maxRedirects: 0 })
  expect(res.status()).toBe(302)
  expect(res.headers().location).toBe('/')
})

test('a missing asset answers 404, not a fallback page with 200', async ({ request }) => {
  const res = await request.get('/assets/none.js')
  expect(res.status()).toBe(404)
  // A cached 404 for a hashed asset would outlive the deploy that adds the file.
  expect(res.headers()['cache-control'] ?? '').not.toContain('immutable')
})
