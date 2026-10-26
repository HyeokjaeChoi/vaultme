import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { A, fixtureApi, TX, type InternalMode, type TxMode } from './fixture-api'

type LayoutShift = PerformanceEntry & { value: number; sources: { node: Node | null }[] }

const widths = [375, 768, 1280]
const hash = `/tx#${TX}`
const detail = (page: Page) => page.getByRole('region', { name: '거래 상세' })

test.describe('transaction page', () => {
  for (const width of widths) {
    test(`row -> detail -> back to the list (${String(width)}px)`, async ({ page }) => {
      await fixtureApi(page)
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`/address#${A}`)
      const rows =
        width >= 768 ? page.locator('tbody tr a') : page.locator('section[aria-labelledby="history-title"] li a')
      await expect(rows).toHaveCount(5)
      await rows.first().click()
      await expect(page).toHaveURL(/\/tx#0x[0-9a-f]{64}$/)
      await expect(page.getByRole('heading', { name: '거래 상세' })).toBeFocused()
      await expect(page.getByText('확정')).toBeVisible()
      await expect(page.getByText('0.05', { exact: true })).toBeVisible()
      await expect(page.getByText('0.000021 ETH')).toBeVisible()
      await expect(page.getByText('#7,420,455')).toBeVisible()
      await page.getByRole('link', { name: '주소로 돌아가기' }).click()
      await expect(page).toHaveURL(new RegExp(`/address#${A}$`))
      await expect(rows).toHaveCount(5)
    })
  }

  test('a direct link shows the transaction; back goes to the address form', async ({ page }) => {
    await fixtureApi(page)
    await page.goto(hash)
    await expect(page.getByText('확정')).toBeVisible()
    await expect(page.getByRole('heading', { name: '거래 상세' })).not.toBeFocused() // a page load leaves the focus alone
    await expect(page.getByRole('link', { name: 'Etherscan에서 보기' })).toHaveAttribute(
      'href',
      `https://sepolia.etherscan.io/tx/${TX}`,
    )
    await page.getByRole('link', { name: '주소로 돌아가기' }).click()
    await expect(page).toHaveURL(/\/address$/)
    await expect(page.getByLabel('Sepolia 주소')).toBeVisible()
  })

  test('a USDC transfer and the English page', async ({ page }) => {
    const api = await fixtureApi(page)
    api.tx = 'usdc'
    await page.goto(`/en${hash}`)
    await expect(page.getByText('12.5', { exact: true })).toBeVisible()
    await expect(page.getByText('USDC', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'View on Etherscan' })).toBeVisible()
    await page.getByRole('link', { name: 'Back to address' }).click()
    await expect(page).toHaveURL(/\/en\/address$/)
  })

  const states: [string, TxMode, string][] = [
    ['not found', 'unknown', '아직 내역에 없어요'],
    ['no block yet', 'pending', '아직 내역에 없어요'],
    ['load failed', 'down', '내역을 불러오지 못했어요'],
  ]
  for (const [name, mode, text] of states) {
    test(`${name}: the state, and Try again reads again`, async ({ page }) => {
      const api = await fixtureApi(page)
      api.tx = mode
      await page.goto(hash)
      await expect(page.getByText(text)).toBeVisible()
      api.tx = 'ok'
      await page.getByRole('button', { name: '다시 시도' }).click()
      await expect(page.getByText('확정')).toBeVisible()
      await expect(detail(page))
        .toBeFocused({ timeout: 1 })
        .catch(() => undefined) // the focus is not on <body>
      expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false)
    })
  }

  // The internal transfers section (#238, Figma "Tx detail · internal list / loading / error").
  for (const width of widths) {
    test(`internal transfers: the list below the rows, a failed one marked (${String(width)}px)`, async ({ page }) => {
      const api = await fixtureApi(page)
      api.internal = 'list'
      await page.setViewportSize({ width, height: 900 })
      await page.goto(hash)
      await expect(page.getByRole('heading', { name: '내부 이동' })).toBeVisible()
      const rows = page.getByRole('listitem')
      await expect(rows).toHaveCount(2)
      await expect(rows.nth(0)).toContainText('0.05 ETH')
      await expect(rows.nth(1)).toContainText('내부 이동 실패')
      await expect(page.getByText('0.05', { exact: true })).toBeVisible() // the headline stays the transaction's own amount
      const [section, button] = await Promise.all([
        page.getByRole('region', { name: '내부 이동' }).boundingBox(),
        page.getByRole('link', { name: 'Etherscan에서 보기' }).boundingBox(),
      ])
      expect((section?.y ?? Infinity) + (section?.height ?? 0)).toBeLessThanOrEqual(button?.y ?? 0)
    })
  }

  test('internal transfers: a long amount wraps in its column, nothing runs past the row (375px)', async ({ page }) => {
    const api = await fixtureApi(page)
    api.internal = 'long'
    await page.setViewportSize({ width: 375, height: 900 })
    await page.goto(hash)
    await expect(page.getByText('0.049873451234567891 ETH')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    const [amount, caption] = await Promise.all([
      page.getByText('0.049873451234567891 ETH').boundingBox(),
      page.getByText(/0x7099…79C8 →/).boundingBox(),
    ])
    expect((caption?.x ?? 0) + (caption?.width ?? 0)).toBeLessThanOrEqual(amount?.x ?? 0)
  })

  test('internal transfers: none hides the section; a failed read shows an error and Try again, the page stays', async ({
    page,
  }) => {
    const api = await fixtureApi(page)
    await page.goto(hash)
    await expect(page.getByText('확정')).toBeVisible()
    await expect(page.getByRole('heading', { name: '내부 이동' })).toHaveCount(0)
    api.internal = 'down'
    await page.reload()
    await expect(page.getByRole('alert')).toContainText('내부 이동을 불러오지 못했어요')
    await expect(page.getByText('0.05', { exact: true })).toBeVisible()
    api.internal = 'list'
    await page.getByRole('button', { name: '다시 시도' }).click()
    await expect(page.getByRole('listitem')).toHaveCount(2)
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false)
  })

  for (const [width, mode] of widths.flatMap((w) => (['none', 'list', 'down'] as const).map((m) => [w, m] as const))) {
    test(`small layout shift when the internal read answers last (${mode}, ${String(width)}px)`, async ({ page }) => {
      const api = await fixtureApi(page)
      api.internal = mode satisfies InternalMode
      let release!: () => void
      api.holdInternal = new Promise<void>((resolve) => (release = resolve))
      await page.route('**/*.woff2', (route) => route.abort())
      await page.setViewportSize({ width, height: 900 })
      await page.addInitScript(() => {
        const w = window as unknown as { cls: number; moved: string[] }
        w.cls = 0
        w.moved = []
        new PerformanceObserver((l) => {
          for (const e of l.getEntries() as unknown as LayoutShift[]) {
            w.cls += e.value
            for (const s of e.sources) if (s.node instanceof Element) w.moved.push(s.node.outerHTML.slice(0, 80))
          }
        }).observe({ type: 'layout-shift', buffered: true })
      })
      await page.goto(hash)
      await expect(page.getByText('확정')).toBeVisible() // the detail shows without the internal read
      await expect(page.getByText('내부 이동을 불러오고 있어요')).toBeAttached() // the section has its own loading state
      await page.evaluate(() => document.fonts.ready)
      const before = await page.evaluate(() => (window as unknown as { cls: number }).cls)
      release()
      await page.waitForTimeout(600)
      const { cls, moved } = await page.evaluate(() => {
        const w = window as unknown as { cls: number; moved: string[] }
        return { cls: w.cls, moved: w.moved }
      })
      // No section = the skeleton's height: nothing moves. A section makes the page taller than the skeleton, so only what is
      // below it (the footer) moves down, once; the detail itself never does.
      // The section shows its loading rows first, so a section that turns out empty pulls the Etherscan link and the footer up. Measured
      // (a 900 px high window): none 0.025 at 768 and 0.010 at 1280, else 0. The limit is well inside the CLS "good" range (0.1).
      expect(cls - before, `${mode} ${JSON.stringify(moved)}`).toBeLessThan(0.05)
    })
  }

  test('a bad hash is the invalid state and asks for nothing', async ({ page }) => {
    const api = await fixtureApi(page)
    for (const bad of ['', '#0x1234', `#${TX}00`]) {
      await page.goto(`/tx${bad}`)
      await expect(page.getByText('거래 해시가 올바르지 않아요')).toBeVisible()
    }
    expect(api.requests.filter((r) => r.path === '/v1/rpc')).toEqual([])
    await page.getByRole('link', { name: '주소 보기' }).first().click()
    await expect(page).toHaveURL(/\/address$/)
  })

  test('a stale answer does not replace newer data: hash A held, hash B shown, then A answers', async ({ page }) => {
    const api = await fixtureApi(page)
    let release!: () => void
    api.holdTx = new Promise<void>((resolve) => (release = resolve))
    await page.goto(hash)
    await expect(page.getByText('거래를 불러오고 있어요')).toBeAttached()
    api.holdTx = null
    api.tx = 'usdc'
    await page.evaluate((h) => (location.hash = h), `0x${'ab'.repeat(32)}`)
    await expect(page.getByText('12.5', { exact: true })).toBeVisible()
    release()
    await page.waitForTimeout(200)
    await expect(page.getByText('12.5', { exact: true })).toBeVisible()
    await expect(page.getByText('0.05', { exact: true })).toHaveCount(0)
  })

  for (const mode of ['ok', 'unknown', 'down'] as const) {
    test(`every link and button is at least 44 x 44 px (${mode})`, async ({ page }) => {
      const api = await fixtureApi(page)
      api.tx = mode
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(hash)
        await page.reload()
        await expect(page.getByRole('link', { name: '주소로 돌아가기' })).toBeVisible()
        await expect(page.getByRole('status').filter({ hasText: '불러오고' })).toHaveCount(0)
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
    })
  }

  // The skeleton has the final sizes: nothing moves from the skeleton to the detail (Figma loading frames = the detail frames).
  // Web fonts are blocked: their swap moves text on every page (see address.spec.ts).
  for (const [width, mode] of widths.flatMap((w) => (['ok', 'creation'] as const).map((m) => [w, m] as const))) {
    test(`no layout shift from the skeleton to the detail (${mode}, ${String(width)}px)`, async ({ page }) => {
      const api = await fixtureApi(page)
      api.tx = mode // a contract creation has no recipient: its row is shorter text, not a shorter row
      await page.route('**/*.woff2', (route) => route.abort())
      let release!: () => void
      api.holdTx = new Promise<void>((resolve) => (release = resolve))
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
      await page.goto(hash)
      await expect(page.getByText('거래를 불러오고 있어요')).toBeAttached()
      await page.evaluate(() => document.fonts.ready)
      const before = await page.evaluate(() => (window as unknown as { cls: number }).cls)
      release()
      await expect(page.getByText('확정')).toBeVisible()
      await page.waitForTimeout(300)
      const { cls, moved } = await page.evaluate(() => {
        const w = window as unknown as { cls: number; moved: string[] }
        return { cls: w.cls, moved: w.moved }
      })
      expect(cls - before, JSON.stringify(moved)).toBeLessThan(0.001)
    })
  }

  // The first paint of a link with a valid hash is the skeleton, with a bad one the invalid state: no shift between them and the hydrated page.
  for (const width of widths) {
    for (const [name, url] of [
      ['valid', hash],
      ['invalid', '/tx#0x12'],
    ] as const) {
      test(`no layout shift at hydration (${name} hash, ${String(width)}px)`, async ({ page }) => {
        const api = await fixtureApi(page)
        await page.route('**/*.woff2', (route) => route.abort())
        api.holdTx = new Promise<void>(() => undefined) // the skeleton stays
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
        await page.goto(url)
        await page.waitForLoadState('load') // networkidle never comes: the held request stays open
        await page.waitForTimeout(800)
        const { cls, moved } = await page.evaluate(() => {
          const w = window as unknown as { cls: number; moved: string[] }
          return { cls: w.cls, moved: w.moved }
        })
        expect(cls, JSON.stringify(moved)).toBeLessThan(0.001)
      })
    }
  }

  const axeStates: [string, TxMode | 'loading' | 'invalid' | 'list' | 'internal-down', string][] = [
    ['detail', 'ok', '확정'],
    ['failed transaction', 'failed', '실패'],
    ['loading', 'loading', '거래를 불러오고 있어요'],
    ['load failed', 'down', '내역을 불러오지 못했어요'],
    ['not found', 'unknown', '아직 내역에 없어요'],
    ['internal list', 'list', '내부 이동 실패'],
    ['internal read failed', 'internal-down', '내부 이동을 불러오지 못했어요'],
    ['invalid hash', 'invalid', '거래 해시가 올바르지 않아요'],
  ]
  for (const [name, mode, ready] of axeStates) {
    for (const scheme of ['light', 'dark'] as const) {
      for (const width of widths) {
        test(`axe finds no violation: ${name} (${scheme}, ${String(width)}px)`, async ({ page }) => {
          const api = await fixtureApi(page)
          if (mode === 'loading') api.holdTx = new Promise<void>(() => undefined)
          else if (mode === 'list') api.internal = 'list'
          else if (mode === 'internal-down') api.internal = 'down'
          else if (mode !== 'invalid') api.tx = mode
          await page.setViewportSize({ width, height: 900 })
          await page.emulateMedia({ colorScheme: scheme })
          await page.goto(mode === 'invalid' ? '/tx#0x12' : hash)
          await expect(page.getByText(ready).first()).toBeAttached()
          const { violations } = await new AxeBuilder({ page }).analyze()
          expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
        })
      }
    }
  }
})
