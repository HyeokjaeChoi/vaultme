import { expect, test } from '@playwright/test'

// WEB-9 (#535): every internal link on the pages answers 200 (after redirects). A link to a page that moved or never existed is a
// broken page for a visitor and a 404 in the logs. External links, `mailto:` and fragment-only links are not checked.
// The 404 pages link to themselves (the language switch keeps the path): the two probe paths are not link targets.
const missing = ['/no-such-page', '/en/no-such-page']
const pages = ['/', '/en/', '/no-such-page', '/en/no-such-page', '/address', '/en/address', '/tx', '/en/tx']

test('every internal link of every page answers 200', async ({ page, request, baseURL }) => {
  const found = new Map<string, string>() // path -> the page it was found on
  for (const path of pages) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const hrefs = await page.locator('a[href]').evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href))
    for (const href of hrefs) {
      const url = new URL(href)
      if (url.origin !== new URL(baseURL ?? 'http://localhost').origin) continue // external, mailto:, ...
      const target = url.pathname + url.search // the fragment never reaches the server
      if (!missing.includes(target) && !found.has(target)) found.set(target, path)
    }
  }
  expect(found.size, 'the pages have internal links to check').toBeGreaterThan(5)
  const broken: string[] = []
  for (const [target, from] of found) {
    const res = await request.get(target)
    if (res.status() !== 200) broken.push(`${target} -> ${String(res.status())} (linked from ${from})`)
  }
  expect(broken).toEqual([])
})
