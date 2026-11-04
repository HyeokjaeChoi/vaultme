import { expect, test } from '@playwright/test'
import { A, fixtureApi } from './fixture-api'

// Motion (#434): it runs by default and is gone under prefers-reduced-motion: reduce. The count of running animations stands for "moves".
const running = (page: import('@playwright/test').Page) => page.evaluate(() => document.getAnimations().length)

for (const reduce of [false, true]) {
  test.describe(`motion (reduced motion: ${String(reduce)})`, () => {
    test.use({ reducedMotion: reduce ? 'reduce' : 'no-preference' })

    test('the history skeleton pulses', async ({ page }) => {
      const api = await fixtureApi(page)
      let release!: () => void
      api.holdHistory = new Promise((r) => (release = r))
      await page.goto(`/address#${A}`)
      await expect(page.locator('[aria-hidden="true"] .skeleton-pulse >> visible=true').first()).toBeVisible()
      if (reduce) expect(await running(page)).toBe(0)
      else expect(await running(page)).toBeGreaterThan(0)
      release()
    })

    test('a FAQ answer fades in when it opens', async ({ page }) => {
      await page.goto('/')
      const opacity = () =>
        page.evaluate(() =>
          Number(getComputedStyle(document.querySelectorAll('details').item(1), '::details-content').opacity),
        )
      await page.locator('details > summary').nth(1).click()
      await expect(page.locator('details').nth(1)).toHaveAttribute('open', '')
      if (reduce) expect(await opacity()).toBe(1)
      else {
        const early = await opacity()
        expect(early).toBeLessThan(1)
        await expect.poll(opacity).toBe(1)
      }
    })

    test('a row opens the transaction page through a view transition', async ({ page }) => {
      await fixtureApi(page)
      await page.addInitScript(() => {
        const w = window as unknown as { vt: number }
        w.vt = 0
        const start = document.startViewTransition.bind(document)
        document.startViewTransition = ((cb: never) => {
          w.vt++
          return start(cb)
        }) as typeof document.startViewTransition
      })
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto(`/address#${A}`)
      await page.locator('tbody tr a').first().click()
      await expect(page).toHaveURL(/\/tx#0x/)
      expect(await page.evaluate(() => (window as unknown as { vt: number }).vt)).toBeGreaterThan(0)
    })
  })
}
