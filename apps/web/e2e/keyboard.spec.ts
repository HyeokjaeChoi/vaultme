import { expect, test, type Page } from '@playwright/test'
import { A, fixtureApi } from './fixture-api'

// WEB-8 (#535): the viewer works with the keyboard alone (Tab, Enter, Space), and every control that takes focus shows a ring.
// No mouse call below: the address is typed, submitted with Enter, a history row is opened with Enter, the way back and the theme
// toggle are used with Enter and Space. Each Tab stop is checked for a visible focus indicator (an outline or a shadow).

const ringless: string[] = []

/** Tabs until `match` is true for the focused element (at most `max` stops); every stop must show a focus ring. */
async function tabTo(page: Page, what: string, match: string, text = '', max = 80) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab')
    const stop = await page.evaluate(
      ([selector, label]) => {
        const el = document.activeElement
        if (!el || el === document.body) return { name: 'body', ring: true, hit: false }
        const s = getComputedStyle(el)
        // A transparent outline (`outline-hidden`) is no ring: its colour needs an alpha above 0.
        // `rgba(r, g, b, a)` and the `/ a` form of rgb(), oklch() and color(); a plain `rgb(r, g, b)` is opaque.
        const c = s.outlineColor
        const a = /\/\s*([\d.]+)(%?)\s*\)$/.exec(c) ?? /^rgba\(.*,\s*([\d.]+)()\)$/.exec(c)
        const alpha = a ? Number(a[1]) / (a[2] ? 100 : 1) : 1
        const ring =
          (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 && alpha > 0) || s.boxShadow !== 'none'
        const name = `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent).trim().slice(0, 30)}"`
        return { name, ring, hit: el.matches(selector ?? '') && el.textContent.includes(label ?? '') }
      },
      [match, text],
    )
    if (!stop.ring) ringless.push(stop.name)
    if (stop.hit) return
  }
  throw new Error(`Tab did not reach ${what} in ${String(max)} stops`)
}

test('address, viewer, a row, the transaction and back, with the keyboard only', async ({ page }) => {
  ringless.length = 0
  await fixtureApi(page)
  await page.goto('/address')
  await page.waitForLoadState('networkidle')

  await tabTo(page, 'the address field', 'input')
  await page.keyboard.type(A)
  await page.keyboard.press('Enter') // submits the form
  await expect(page.getByText('12.5 USDC')).toBeVisible()

  await tabTo(page, 'a history row', 'a[href^="/tx"]')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: '거래 상세' })).toBeFocused() // a route change moves the focus to the heading

  await tabTo(page, 'the way back', 'a[href^="/address"]', '주소로 돌아가기')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: '조회한 주소' })).toBeVisible()

  await tabTo(page, 'the theme toggle', 'button[aria-label*="화면 테마"]')
  await page.keyboard.press('Space')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.keyboard.press('Enter')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  expect(ringless, 'focused controls with no visible focus ring').toEqual([])
})
