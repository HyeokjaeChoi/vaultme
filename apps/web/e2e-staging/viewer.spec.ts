import { expect, test, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

// WEB-5: the viewer on the real staging site with the real staging API (balances, history, a transaction).
// The address is a public test vector (R10) that has Sepolia history. The limits are the gate's: ready in <= 10 s,
// 0 CSP violations, 0 page errors. LCP is only recorded (the network is real).
const ADDRESS = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
const LIMIT_MS = 10_000

type Window = typeof globalThis & { __reportCsp: (what: string) => void; __lcp?: number }

/** Lists every CSP violation event and page error from the first byte of each document. */
async function watch(page: Page) {
  const csp: string[] = []
  const errors: string[] = []
  await page.exposeFunction('__reportCsp', (what: string) => void csp.push(what))
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) =>
      (window as unknown as Window).__reportCsp(`${e.violatedDirective} blocked "${e.blockedURI}" ${e.sample}`),
    )
    new PerformanceObserver((list) => {
      const last = list.getEntries().at(-1)
      if (last) (window as unknown as Window).__lcp = last.startTime
    }).observe({ type: 'largest-contentful-paint', buffered: true })
  })
  page.on('pageerror', (e) => void errors.push(e.message))
  return { csp, errors }
}

const lcp = (page: Page) => page.evaluate(() => (window as unknown as Window).__lcp ?? null)

test('the viewer shows balances and history, and a transaction opens', async ({ page }) => {
  const seen = await watch(page)

  const started = Date.now()
  await page.goto(`/address#${ADDRESS}`)
  // Balances: both rows have an amount (the failed state has none).
  await expect(page.getByText(/\d[\d,.]*\s*ETH/).first()).toBeVisible({ timeout: LIMIT_MS })
  await expect(page.getByText(/\d[\d,.]*\s*USDC/).first()).toBeVisible({ timeout: LIMIT_MS })
  // History: rows, or the empty state. The failed state is neither.
  const rows = page.locator('tbody tr')
  const empty = page.getByText('아직 거래가 없어요')
  await expect(rows.first().or(empty)).toBeVisible({ timeout: LIMIT_MS })
  const viewerMs = Date.now() - started
  await expect(page.getByText('잔액을 불러오지 못했어요')).toHaveCount(0)
  await expect(page.getByText('내역을 불러오지 못했어요')).toHaveCount(0)
  const viewerLcp = await lcp(page)

  // The transaction page, opened by its link as a new page load: it reads the chain through the API.
  let txMs: number | null = null
  const rowCount = await rows.count()
  if (rowCount > 0) {
    const href = await rows.first().locator('a').first().getAttribute('href')
    expect(href, 'the first row links to /tx#<hash>').toMatch(/\/tx#0x[0-9a-f]{64}$/)
    if (!href) throw new Error('unreachable')
    const txStarted = Date.now()
    await page.goto(href)
    const detail = page.getByRole('region', { name: '거래 상세' })
    await expect(detail.getByText(/확정|실패/).first()).toBeVisible({ timeout: LIMIT_MS })
    await expect(detail.getByText(/\d[\d,.]*/).first()).toBeVisible({ timeout: LIMIT_MS })
    txMs = Date.now() - txStarted
  }

  expect(seen.csp, 'CSP violations').toEqual([])
  expect(seen.errors, 'page errors').toEqual([])
  expect(viewerMs).toBeLessThanOrEqual(LIMIT_MS)

  // The numbers of this run, in the shape `evidence emit --results` reads (ResultInput[]).
  const result = (metric: string, value: number, unit: string, op: '<=' | '==' | null, limit: number) => ({
    metric,
    value,
    unit,
    threshold: op ? { op, value: limit } : null,
    n: 1,
    window: 'one run',
  })
  mkdirSync('test-results', { recursive: true })
  writeFileSync(
    'test-results/viewer-smoke.json',
    JSON.stringify(
      [
        result('Viewer ready, balances and history', viewerMs / 1000, 's', '<=', LIMIT_MS / 1000),
        ...(txMs === null ? [] : [result('Transaction page ready', txMs / 1000, 's', '<=', LIMIT_MS / 1000)]),
        result('CSP violations', seen.csp.length, 'count', '==', 0),
        result('Page errors', seen.errors.length, 'count', '==', 0),
        ...(viewerLcp === null ? [] : [result('Viewer LCP', viewerLcp / 1000, 's', null, 0)]),
      ],
      null,
      2,
    ),
  )
})
