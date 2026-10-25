import AxeBuilder from '@axe-core/playwright'
import { type Page, type Route, expect, test } from '@playwright/test'

type LayoutShift = PerformanceEntry & { value: number; sources: { node: Node | null }[] }

// The viewer against fixture answers: the default build calls the staging API (scripts/finalize.ts apiOrigin), and
// every request to it is answered here. Real data only in app code. No test reads balances from the real staging API
// yet (the web-staging smoke only checks the 404 page).
const API = 'https://vaultme-api-staging.gurwo1007.workers.dev'
const A = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'

type Mode = 'ok' | 'down'
async function fixtureApi(page: Page) {
  const api = { mode: 'ok' as Mode, registers: 0, requests: [] as { path: string; headers: Record<string, string> }[] }
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
  const json = (route: Route, status: number, body: unknown) =>
    route.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(body) })
  await page.route(`${API}/**`, (route) => {
    const req = route.request()
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    const path = new URL(req.url()).pathname
    api.requests.push({ path, headers: req.headers() })
    if (path === '/v1/installs') {
      api.registers++
      return json(route, 201, { installId: crypto.randomUUID() })
    }
    if (path === '/v1/installs/token')
      return json(route, 200, { token: 'tok', expiresAt: Math.floor(Date.now() / 1000) + 900 })
    if (api.mode === 'down') return json(route, 503, { code: 'unavailable', message: 'x', retryable: true })
    const { id, method } = req.postDataJSON() as { id: number; method: string }
    const result = method === 'eth_getBalance' ? '0x11d448f27b93c000' : '0xbebc20' // 1.284732 ETH, 12.5 USDC
    return json(route, 200, { jsonrpc: '2.0', id, result })
  })
  return api
}

test.describe('address input', () => {
  test('input -> viewer with balances; the address stays in the fragment', async ({ page }) => {
    const api = await fixtureApi(page)
    await page.goto('/address')
    await page.getByLabel('Sepolia 주소').fill(A)
    await page.getByRole('button', { name: '주소 보기' }).click()
    await expect(page.getByText('1.284732 ETH')).toBeVisible()
    await expect(page.getByText('12.5 USDC')).toBeVisible()
    const url = new URL(page.url())
    expect(url.pathname + url.search).toBe('/address')
    expect(url.hash).toBe(`#${A}`)
    expect(api.requests.length).toBeGreaterThan(0)
    for (const r of api.requests) {
      expect(r.headers['x-client']).toBe('web')
      expect(r.headers['x-app-version']).toMatch(/^\d+\.\d+\.\d+$/)
    }
  })

  // A slow network: the user submits before the app hydrates. The address must not leave in a query string.
  test('a submit before hydration puts the address in the fragment', async ({ page }) => {
    await fixtureApi(page)
    await page.route('**/assets/*.js', (route) => route.abort())
    await page.goto('/address', { waitUntil: 'commit' })
    await page.getByLabel('Sepolia 주소').fill(A)
    await page.getByRole('button', { name: '주소 보기' }).click()
    await expect(page).toHaveURL(`/address#${A}`)
  })

  test('an address typed before hydration is kept', async ({ page }) => {
    await fixtureApi(page)
    const held: Route[] = []
    await page.route('**/assets/*.js', (route) => void held.push(route))
    await page.goto('/address', { waitUntil: 'commit' })
    await page.getByLabel('Sepolia 주소').fill(A)
    await page.unroute('**/assets/*.js')
    for (const r of held) await r.continue()
    await expect(page.locator('html[data-boot="form"]')).toHaveCount(1) // hydrated: data-boot follows the view
    await page.getByRole('button', { name: '주소 보기' }).click()
    await expect(page.getByText('12.5 USDC')).toBeVisible()
  })

  test('an invalid address shows the inline error and no request leaves', async ({ page }) => {
    const api = await fixtureApi(page)
    await page.goto('/address')
    await page.getByLabel('Sepolia 주소').fill('0x1234abcd')
    await page.getByRole('button', { name: '주소 보기' }).click()
    await expect(page.getByRole('alert')).toHaveText(/올바른 주소가 아니에요/)
    expect(new URL(page.url()).hash).toBe('')
    expect(api.requests).toEqual([])
  })

  test('/address answers 200 without a redirect to /address/', async ({ request }) => {
    for (const path of ['/address', '/en/address']) {
      const res = await request.get(path, { maxRedirects: 0 })
      expect(res.status()).toBe(200)
    }
  })
})

test.describe('viewer', () => {
  test('load failed -> retry -> balances', async ({ page }) => {
    const api = await fixtureApi(page)
    api.mode = 'down'
    await page.goto(`/address#${A}`)
    await expect(page.getByRole('alert')).toHaveText(/잔액을 불러오지 못했어요/)
    api.mode = 'ok'
    await page.getByRole('button', { name: '다시 시도' }).click()
    await expect(page.getByText('12.5 USDC')).toBeVisible()
  })

  test('the install key is made once, survives a reload and cannot be read out', async ({ page }) => {
    const api = await fixtureApi(page)
    await page.goto(`/address#${A}`)
    await expect(page.getByText('12.5 USDC')).toBeVisible()
    await page.reload()
    await expect(page.getByText('12.5 USDC')).toBeVisible()
    expect(api.registers).toBe(1)
    const extractable = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const open = indexedDB.open('vaultme')
          open.onsuccess = () => {
            const get = open.result.transaction('install').objectStore('install').get('device')
            get.onsuccess = () => resolve((get.result as { pair: CryptoKeyPair }).pair.privateKey.extractable)
          }
        }),
    )
    expect(extractable).toBe(false)
  })

  // The skeleton has the final sizes, so no box moves from first paint to the balances. Web fonts are blocked here:
  // their swap after first paint (fonts.css, apps/web/AGENTS.md) moves text on every page, by how much depends on the
  // system fallback font (Linux CI has no Apple SD Gothic Neo), and Lighthouse measures it on its own. What is left is
  // the address text inside its unmoved box (measured 0.0018 at 375 px), reported for its glyphs only.
  for (const width of [375, 768, 1280]) {
    test(`a viewer link paints the final layout (${String(width)}px)`, async ({ page }) => {
      await fixtureApi(page)
      await page.route('**/*.woff2', (route) => route.abort())
      await page.setViewportSize({ width, height: 900 })
      await page.addInitScript(() => {
        const w = window as unknown as { cls: number; moved: string[] }
        w.cls = 0
        w.moved = []
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as unknown as LayoutShift[]) {
            w.cls += e.value
            for (const s of e.sources) if (s.node instanceof Element) w.moved.push(s.node.outerHTML.slice(0, 80))
          }
        }).observe({ type: 'layout-shift', buffered: true })
      })
      await page.goto(`/address#${A}`)
      await expect(page.getByText('12.5 USDC')).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      const { cls, moved } = await page.evaluate(() => {
        const w = window as unknown as { cls: number; moved: string[] }
        return { cls: w.cls, moved: w.moved }
      })
      expect(moved).toEqual([])
      expect(cls).toBeLessThan(0.005)
    })
  }

  test('has no console error (the CSP allows the API and the boot script)', async ({ page }) => {
    await fixtureApi(page)
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(`/address#${A}`)
    await expect(page.getByText('12.5 USDC')).toBeVisible()
    await page.goto('/en/address')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Enter an address')
    expect(errors).toEqual([])
  })
})

const states = [
  { name: 'form', path: '/address', ready: '주소를 넣어 보세요' },
  { name: 'invalid', path: '/address#0x1234abcd', ready: '올바른 주소가 아니에요' },
  { name: 'viewer', path: `/address#${A}`, ready: '12.5 USDC' },
  { name: 'en viewer', path: `/en/address#${A}`, ready: '12.5 USDC' },
] as const

for (const s of states) {
  for (const scheme of ['light', 'dark'] as const) {
    for (const width of [375, 1280]) {
      test(`axe finds no violation: ${s.name} (${scheme}, ${String(width)}px)`, async ({ page }) => {
        await fixtureApi(page)
        await page.setViewportSize({ width, height: 900 })
        await page.emulateMedia({ colorScheme: scheme })
        await page.goto(s.path)
        await expect(page.getByText(s.ready).first()).toBeVisible()
        const { violations } = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'])
          .analyze()
        expect(violations).toEqual([])
      })
    }
  }
  for (const width of [375, 768, 1280]) {
    test(`every link and button is at least 44 x 44 px: ${s.name} (${String(width)}px)`, async ({ page }) => {
      await fixtureApi(page)
      await page.setViewportSize({ width, height: 900 })
      await page.goto(s.path)
      await expect(page.getByText(s.ready).first()).toBeVisible()
      const small = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('a, button')]
          // Not the skip link (hidden until focused), not an element that is not rendered (before hydration the page
          // holds the form and the viewer skeleton, one of them display: none).
          .filter((el) => !el.matches('a[href="#main"]') && el.getClientRects().length > 0)
          .flatMap((el) => {
            const { width, height } = el.getBoundingClientRect()
            return width < 44 || height < 44
              ? [`${el.getAttribute('aria-label') ?? el.textContent.trim()}: ${String(width)} x ${String(height)}`]
              : []
          }),
      )
      expect(small).toEqual([])
    })
  }
}
