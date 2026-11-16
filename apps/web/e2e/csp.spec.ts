import { expect, test, type Page } from '@playwright/test'
import { settled } from './settle'
import { A, fixtureApi, TX } from './fixture-api'

// WEB-4 (#515): 0 `securitypolicyviolation` events on every page and state. The site runs on the real Workers Static Assets runtime,
// so `public/_headers` (default-src 'none', script hashes, style-src 'self', connect-src with the API origin) is the policy under test.
// A blocked inline style, image, font or request raises no error a user sees, and a spec that never opens that state never notices.
// The event is listened to from the first byte of each document and reported to the test, which keeps the list across navigations.

type Window = typeof globalThis & { __reportCsp: (what: string) => void }

async function watch(page: Page): Promise<string[]> {
  const seen: string[] = []
  await page.exposeFunction('__reportCsp', (what: string) => void seen.push(what))
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) =>
      (window as unknown as Window).__reportCsp(
        `${e.violatedDirective} blocked "${e.blockedURI}" at ${e.sourceFile}:${String(e.lineNumber)} ${e.sample}`,
      ),
    )
  })
  // Chromium also writes a console error for each one; a report that never became an event (a worker, a frame) shows here.
  page.on(
    'console',
    (m) => /Content Security Policy|Refused to/i.test(m.text()) && void seen.push(`console: ${m.text()}`),
  )
  return seen
}

/** Opens a page, checks that the policy is really on, and waits until it has settled. */
async function open(page: Page, url: string) {
  await page.goto('about:blank') // a change of the fragment alone is no new document: no new policy, no new run of the scripts
  const res = await page.goto(url)
  expect(res?.headers()['content-security-policy'], `${url} answers a CSP`).toContain("default-src 'none'")
  await page.waitForLoadState('networkidle')
}

/** auto -> light -> dark -> auto: each step sets `data-theme` and the colors that follow it. */
async function toggleTheme(page: Page) {
  const toggle = page.getByRole('button', { name: /화면 테마|Color theme/ })
  for (let i = 0; i < 3; i++) await toggle.click()
  await settled(page)
}

test.describe('static pages', () => {
  for (const path of ['/', '/en/', '/no-such-page', '/en/no-such-page']) {
    test(`${path}: no violation, the FAQ and the theme toggle included`, async ({ page }) => {
      const seen = await watch(page)
      await open(page, path)
      const faq = page.locator('summary')
      if ((await faq.count()) > 0) await faq.first().click()
      await toggleTheme(page)
      expect(seen).toEqual([])
    })
  }
})

test.describe('address viewer', () => {
  test('the form, an invalid address and the viewer with its rows (ko and en)', async ({ page }) => {
    const seen = await watch(page)
    await fixtureApi(page)
    await open(page, '/address')
    await page.getByLabel('Sepolia 주소').fill('0x1234abcd')
    await page.getByRole('button', { name: '주소 보기' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await page.getByLabel('Sepolia 주소').fill(A)
    await page.getByRole('button', { name: '주소 보기' }).click()
    await expect(page.getByText('12.5 USDC')).toBeVisible()
    await page.getByRole('button', { name: '더 보기' }).click()
    await expect(page.getByRole('button', { name: '더 보기' })).toHaveCount(0)
    await toggleTheme(page)
    await open(page, `/en/address#${A}`)
    await expect(page.getByRole('button', { name: 'Show more' })).toBeVisible()
    await toggleTheme(page)
    expect(seen).toEqual([])
  })

  test('the empty, down and big answers', async ({ page }) => {
    const seen = await watch(page)
    const api = await fixtureApi(page)
    for (const history of ['empty', 'down', 'big'] as const) {
      api.history = history
      await open(page, `/address#${A}`)
      await settled(page)
    }
    api.mode = 'down'
    await open(page, `/address#${A}`)
    await toggleTheme(page)
    expect(seen).toEqual([])
  })
})

test.describe('transaction page', () => {
  test('every answer of the transaction read, ko and en', async ({ page }) => {
    const seen = await watch(page)
    const api = await fixtureApi(page)
    for (const tx of ['ok', 'usdc', 'failed', 'unknown', 'pending', 'creation', 'down', 'big'] as const) {
      api.tx = tx
      await open(page, `/tx#${TX}`)
      await settled(page)
    }
    api.tx = 'ok'
    await open(page, `/en/tx#${TX}`)
    await toggleTheme(page)
    expect(seen).toEqual([])
  })

  test('the internal transfers: list, capped, error and retry', async ({ page }) => {
    const seen = await watch(page)
    const api = await fixtureApi(page)
    for (const internal of ['none', 'list', 'many', 'capped', 'long'] as const) {
      api.internal = internal
      await open(page, `/tx#${TX}`)
      await expect(page.getByRole('link', { name: /Etherscan/ }).first()).toBeVisible()
      await settled(page)
    }
    api.internal = 'down'
    await open(page, `/tx#${TX}`)
    await expect(page.getByText('내부 이동을 불러오지 못했어요')).toBeVisible()
    api.internal = 'list'
    await page.getByRole('button', { name: '다시 시도' }).click()
    await expect(page.getByText('내부 이동 실패')).toBeVisible()
    await toggleTheme(page)
    expect(seen).toEqual([])
  })

  test('an invalid hash, no hash, and the move from a history row and back', async ({ page }) => {
    const seen = await watch(page)
    await fixtureApi(page)
    await open(page, '/tx#0x12')
    await open(page, '/tx')
    await open(page, `/address#${A}`)
    await page.locator('main a[href^="/tx"]:visible').first().click() // a table row at 1280 px, a card at 375
    await expect(page.getByRole('heading', { name: '거래 상세' })).toBeVisible()
    await page.getByRole('link', { name: '주소로 돌아가기' }).click()
    await expect(page.getByRole('heading', { name: '조회한 주소' })).toBeVisible() // back to the viewer: the row passed its address
    expect(seen).toEqual([])
  })
})

// The detector is not blind: an inline script without a hash is what the policy blocks.
test('the watcher sees a violation on the real page', async ({ page }) => {
  const seen = await watch(page)
  await open(page, '/')
  await page.evaluate(() => {
    const s = document.createElement('script')
    s.textContent = 'window.__x = 1'
    document.head.append(s)
  })
  await expect.poll(() => seen.length).toBeGreaterThan(0)
  expect(seen.join('\n')).toContain('script-src')
  // The event itself, not only Chromium's console line, must have been seen: a broken listener would otherwise pass.
  await expect.poll(() => seen.some((s) => !s.startsWith('console:'))).toBe(true)
})
