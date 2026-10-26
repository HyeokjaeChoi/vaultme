import { expect, test } from '@playwright/test'

// Runs against a build with WEB_ANALYTICS_TOKEN (the staging build; CI `web` builds none and skips it). The real beacon is
// stubbed, so this checks only what we own: the tag, and that the CSP lets the script and its RUM request through.
const BEACON = 'https://static.cloudflareinsights.com/beacon.min.js'
const RUM = 'https://cloudflareinsights.com/cdn-cgi/rum'

test('the Web Analytics beacon loads and its RUM request passes the CSP', async ({ page, request }) => {
  const html = await (await request.get('/')).text()
  test.skip(!html.includes('data-cf-beacon'), 'build has no WEB_ANALYTICS_TOKEN')
  const rum: string[] = []
  await page.route(BEACON, (r) =>
    r.fulfill({ contentType: 'text/javascript', body: `fetch('${RUM}', { method: 'POST', body: location.href })` }),
  )
  await page.route(RUM, (r) => {
    rum.push(r.request().url())
    return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } })
  })
  const violations: string[] = []
  page.on('console', (m) => m.text().includes('Content Security Policy') && violations.push(m.text()))
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await expect(page.locator(`script[src="${BEACON}"]`)).toHaveAttribute('data-cf-beacon', /"token":"[0-9a-f]{32}"/)
  expect(rum).toEqual([RUM])
  expect(violations).toEqual([])
})
