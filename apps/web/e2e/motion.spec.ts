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
        const w = window as unknown as { vt: number; grown: string[] }
        w.vt = 0
        w.grown = []
        const start = document.startViewTransition.bind(document)
        document.startViewTransition = ((cb: never) => {
          w.vt++
          const t = start(cb)
          // A group that changes size is a pair: the old and the new box of one name. An unpaired name has no size change.
          void t.ready.then(() => {
            for (const a of document.getAnimations()) {
              const e = a.effect as KeyframeEffect | null
              const p = e?.pseudoElement
              const k = e?.getKeyframes()
              if (p?.startsWith('::view-transition-group(tx-') && k?.length && k[0]?.width !== k[k.length - 1]?.width)
                w.grown.push(p)
            }
          })
          return t
        }) as typeof document.startViewTransition
      })
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto(`/address#${A}`)
      await page.locator('tbody tr a').first().click()
      await expect(page).toHaveURL(/\/tx#0x/)
      expect(await page.evaluate(() => (window as unknown as { vt: number }).vt)).toBeGreaterThan(0)
      // The status badge and the amount of the row travel into the detail as one object each (#466); reduced motion has no animation to see.
      if (!reduce) {
        const read = () => page.evaluate(() => (window as unknown as { grown: string[] }).grown)
        await expect.poll(async () => (await read()).length).toBeGreaterThan(0)
        const grown = await read()
        expect(grown.filter((p) => p.includes('tx-status-0x')).length).toBeGreaterThan(0)
        expect(grown.filter((p) => p.includes('tx-amount-0x')).length).toBeGreaterThan(0)
      }
    })

    test('the viewer sections rise top to bottom, 30 ms apart (#466)', async ({ page }) => {
      await fixtureApi(page)
      await page.goto(`/address#${A}`)
      await expect(page.locator('tbody tr').first()).toBeVisible()
      // Computed delays: address block, ETH card, USDC card, History section. Reduced motion declares no transition at all.
      const delays = await page.evaluate(() =>
        [...document.querySelectorAll('.rise-in')].map((e) => ({
          delay: getComputedStyle(e).transitionDelay,
          props: getComputedStyle(e).transitionProperty,
        })),
      )
      expect(delays).toHaveLength(4)
      if (reduce) expect(delays.every((d) => d.delay === '0s' && d.props === 'all')).toBe(true)
      else expect(delays.map((d) => d.delay)).toEqual(['0s', '0.03s', '0.06s', '0.09s'])
    })

    test('Retry after a failed balance read does not replay the page-open rise (#466)', async ({ page }) => {
      const api = await fixtureApi(page)
      api.mode = 'down'
      await page.goto(`/address#${A}`)
      await expect(page.getByRole('alert').first()).toBeVisible()
      // Failed: the cards are gone, only the address block and History carry the rise.
      await expect(page.locator('.rise-in')).toHaveCount(2)
      api.mode = 'ok'
      await page.getByRole('button', { name: '다시 시도' }).click()
      await expect(page.getByText('12.5 USDC')).toBeVisible()
      await expect(page.locator('.rise-in')).toHaveCount(2)
    })

    test('the transaction page fades as one block, no stagger (#466)', async ({ page }) => {
      await fixtureApi(page)
      await page.goto(`/address#${A}`)
      await page.locator('tbody tr a').first().click()
      await expect(page).toHaveURL(/\/tx#0x/)
      await expect(page.locator('dl')).toBeVisible()
      // One fade-in block holds the whole result; nothing on the page rises on its own.
      await expect(page.locator('[data-boot-viewer] .fade-in')).toHaveCount(1)
      await expect(page.locator('.rise-in')).toHaveCount(0)
    })
  })
}
