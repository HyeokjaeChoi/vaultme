import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { A, fixtureApi, type HistoryMode } from './fixture-api'

type LayoutShift = PerformanceEntry & { value: number; sources: { node: Node | null }[] }

const widths = [375, 768, 1280]
// 768 and 1280 are the table, 375 the cards (Figma: History frames of the Viewer section).
const rows = (page: import('@playwright/test').Page, width: number) =>
  width >= 768 ? page.locator('tbody tr') : page.locator('section[aria-labelledby="history-title"] li')

test.describe('viewer history', () => {
  for (const width of widths) {
    test(`list: first 5 rows, 더 보기 shows more and asks for the next page (${String(width)}px)`, async ({ page }) => {
      const api = await fixtureApi(page)
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`/address#${A}`)
      await expect(rows(page, width)).toHaveCount(5)
      expect(api.historyCursors).toEqual([undefined])
      const history = page.getByRole('region', { name: '거래 내역' })
      await expect(history.getByText('+0.05 ETH').locator('visible=true').first()).toBeVisible()
      await expect(history.getByText('−0.02 ETH').locator('visible=true').first()).toBeVisible()
      await expect(history.getByText('+7.5 USDC').locator('visible=true').first()).toBeVisible()
      // The failed send: words and icon, and no sign (cards).
      await expect(
        history
          .getByText(width >= 768 ? '실패' : '보내기 실패')
          .locator('visible=true')
          .first(),
      ).toBeVisible()
      // 12 rows in the first page, one is the filtered poisoning row: the next page is asked for when the 11 run out.
      await page.getByRole('button', { name: '더 보기' }).click()
      await expect(rows(page, width)).toHaveCount(14)
      await expect(page.getByRole('button', { name: '더 보기' })).toHaveCount(0)
      expect(api.historyCursors).toEqual([undefined, 'p2'])
    })
  }

  test('the poisoning row (incoming, value 0) is not shown', async ({ page }) => {
    await fixtureApi(page)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`/address#${A}`)
    await page.getByRole('button', { name: '더 보기' }).click()
    await expect(page.locator('tbody tr')).toHaveCount(14)
    await expect(page.getByText('0 ETH', { exact: true })).toHaveCount(0)
  })

  for (const width of widths) {
    test(`empty: faucet link (${String(width)}px)`, async ({ page }) => {
      const api = await fixtureApi(page)
      api.history = 'empty'
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`/address#${A}`)
      await expect(page.getByText('아직 거래가 없어요')).toBeVisible()
      await expect(page.getByRole('link', { name: 'Sepolia 파우셋 열기' })).toHaveAttribute(
        'href',
        'https://faucet.quicknode.com/ethereum/sepolia',
      )
      await expect(page.getByRole('link', { name: 'Etherscan에서 보기' })).toHaveCount(0)
    })

    test(`failed -> 다시 시도 -> list (${String(width)}px)`, async ({ page }) => {
      const api = await fixtureApi(page)
      api.history = 'down'
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`/address#${A}`)
      await expect(page.getByText('내역을 불러오지 못했어요')).toBeVisible()
      // the balances are fine: a failed history is its own state
      await expect(page.getByText('12.5 USDC').first()).toBeVisible()
      api.history = 'list'
      await page.getByRole('button', { name: '다시 시도' }).click()
      await expect(rows(page, width)).toHaveCount(5)
      await expect(page.getByRole('region', { name: '거래 내역' })).toBeFocused() // the retry button is gone: focus moved, not lost
    })
  }

  test('더 보기 that fails keeps the rows, says so, and works again', async ({ page }) => {
    const api = await fixtureApi(page)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`/address#${A}`)
    await expect(page.locator('tbody tr')).toHaveCount(5)
    api.history = 'down'
    await page.getByRole('button', { name: '더 보기' }).click()
    await expect(page.getByRole('alert').filter({ hasText: '더 불러오지 못했어요' })).toBeVisible()
    await expect(page.locator('tbody tr')).toHaveCount(11) // the rows of the first page all show, none is lost
    api.history = 'list'
    await page.getByRole('button', { name: '더 보기' }).click()
    await expect(page.locator('tbody tr')).toHaveCount(14)
    await expect(page.getByRole('alert').filter({ hasText: '더 불러오지 못했어요' })).toHaveCount(0)
  })

  test('더 보기 shows its own loading state and a second click asks for nothing', async ({ page }) => {
    const api = await fixtureApi(page)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`/address#${A}`)
    await expect(page.locator('tbody tr')).toHaveCount(5)
    let release!: () => void
    api.holdHistory = new Promise<void>((resolve) => (release = resolve))
    const more = page.getByRole('button', { name: '더 보기' })
    await more.click()
    await expect(more).toBeDisabled()
    await expect(more).toHaveAttribute('aria-busy', 'true')
    release()
    await expect(page.locator('tbody tr')).toHaveCount(14)
    expect(api.historyCursors).toEqual([undefined, 'p2'])
  })

  test('a stale answer does not replace newer data: A -> B quickly, then back to A', async ({ page }) => {
    const api = await fixtureApi(page)
    api.history = 'empty'
    let release!: () => void
    api.holdHistory = new Promise<void>((resolve) => (release = resolve))
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`/address#${A}`)
    await expect(page.getByText('거래 내역을 불러오고 있어요')).toBeAttached()
    api.history = 'list'
    api.holdHistory = null
    await page.evaluate(() => (location.hash = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'))
    await expect(page.locator('tbody tr')).toHaveCount(5)
    release() // the first (empty) answer comes last
    await page.waitForTimeout(200)
    await expect(page.locator('tbody tr')).toHaveCount(5)
    await expect(page.getByText('아직 거래가 없어요')).toHaveCount(0)
  })

  test('a very long amount wraps inside its cell and the row grows only by its own text (375px and 1280px)', async ({
    page,
  }) => {
    const api = await fixtureApi(page)
    api.history = 'big'
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`/address#${A}`)
      const amount = page.getByText('+1000000000000 ETH')
      await expect(amount.locator('visible=true').first()).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    }
  })

  test('every link and button is at least 44 x 44 px, history states included', async ({ page }) => {
    const api = await fixtureApi(page)
    for (const [mode, ready] of [
      ['list', '더 보기'],
      ['empty', '파우셋'],
      ['down', '다시 시도'],
    ] as [HistoryMode, string][]) {
      api.history = mode
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(`/address#${A}`)
        await page.reload()
        await expect(page.getByText(ready).first()).toBeVisible()
        const small = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('a, button')]
            .filter((el) => !el.matches('a[href="#main"]') && el.getClientRects().length > 0)
            .flatMap((el) => {
              const { width, height } = el.getBoundingClientRect()
              return width < 44 || height < 44 ? [`${el.textContent.trim()}: ${String(width)} x ${String(height)}`] : []
            }),
        )
        expect(small, `${mode} ${String(width)}`).toEqual([])
      }
    }
  })

  // The skeleton has the final sizes: nothing moves from the skeleton to five rows (Figma loading frames = the list frames).
  // Web fonts are blocked: their swap moves text on every page (see address.spec.ts).
  for (const width of widths) {
    test(`no layout shift from the skeleton to the list, and from 더 보기 (${String(width)}px)`, async ({ page }) => {
      const api = await fixtureApi(page)
      await page.route('**/*.woff2', (route) => route.abort())
      let release!: () => void
      api.holdHistory = new Promise<void>((resolve) => (release = resolve))
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
      await expect(page.getByText('12.5 USDC').first()).toBeVisible() // the balances are in
      await page.evaluate(() => document.fonts.ready)
      const before = await page.evaluate(() => (window as unknown as { cls: number }).cls)
      release()
      await expect(rows(page, width)).toHaveCount(5)
      await page.waitForTimeout(300)
      const { cls, moved } = await page.evaluate(() => {
        const w = window as unknown as { cls: number; moved: string[] }
        return { cls: w.cls, moved: w.moved }
      })
      expect(cls - before, JSON.stringify(moved)).toBeLessThan(0.001)
      expect(moved.filter((m) => !m.includes('address') && !m.includes('0x'))).toEqual([])
    })
  }

  // A shorter state must not pull the footer up into view (CLS): the section keeps the skeleton's height (app.css min-h-history-body).
  for (const width of widths) {
    for (const mode of ['empty', 'down'] as const) {
      test(`${mode === 'empty' ? 'empty' : 'failed'} keeps the height of the skeleton, footer included (${String(width)}px)`, async ({
        page,
      }) => {
        const api = await fixtureApi(page)
        api.history = mode
        let release!: () => void
        api.holdHistory = new Promise<void>((resolve) => (release = resolve))
        await page.setViewportSize({ width, height: 900 })
        await page.goto(`/address#${A}`)
        const footer = page.getByRole('contentinfo')
        await expect(page.getByText('12.5 USDC').first()).toBeVisible()
        const top = () => footer.evaluate((el) => el.getBoundingClientRect().top + window.scrollY)
        const skeleton = await top()
        release()
        await expect(page.getByText(mode === 'empty' ? '아직 거래가 없어요' : '내역을 불러오지 못했어요')).toBeVisible()
        expect(await top()).toBe(skeleton)
      })
    }
  }

  test('the history request is a web request through the same install identity', async ({ page }) => {
    const api = await fixtureApi(page)
    await page.goto(`/address#${A}`)
    await expect(page.locator('tbody tr, section[aria-labelledby="history-title"] li').first()).toBeAttached()
    const h = api.requests.find((r) => r.path === '/v1/history')
    expect(h?.headers['x-client']).toBe('web')
    expect(api.registers).toBe(1) // balances and history share one install
  })
})

const states = [
  { name: 'list', mode: 'list', ready: '더 보기' },
  { name: 'empty', mode: 'empty', ready: '아직 거래가 없어요' },
  { name: 'failed', mode: 'down', ready: '내역을 불러오지 못했어요' },
] as const
for (const s of states) {
  for (const scheme of ['light', 'dark'] as const) {
    for (const width of widths) {
      test(`axe finds no violation: history ${s.name} (${scheme}, ${String(width)}px)`, async ({ page }) => {
        const api = await fixtureApi(page)
        api.history = s.mode
        await page.setViewportSize({ width, height: 900 })
        await page.emulateMedia({ colorScheme: scheme })
        await page.goto(`/address#${A}`)
        await expect(page.getByText(s.ready).first()).toBeVisible()
        const { violations } = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'])
          .analyze()
        expect(violations).toEqual([])
      })
    }
  }
}

test('en: the history is in English', async ({ page }) => {
  await fixtureApi(page)
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(`/en/address#${A}`)
  await expect(page.getByRole('heading', { level: 2, name: 'Transactions' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Show more' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Counterparty' })).toBeVisible()
})
