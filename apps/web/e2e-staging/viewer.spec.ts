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
  // Chromium also writes a console error for a violation that never became an event (a worker, a frame).
  page.on(
    'console',
    (m) => /Content Security Policy|Refused to/i.test(m.text()) && void csp.push(`console: ${m.text()}`),
  )
  return { csp, errors }
}

const lcp = (page: Page) => page.evaluate(() => (window as unknown as Window).__lcp ?? null)

test('the viewer shows balances and history, and a transaction opens', async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  const seen = await watch(page)
  let viewerMs: number | null = null
  let txMs: number | null = null
  let viewerLcp: number | null = null
  try {
    const started = Date.now()
    await page.goto(`/address#${ADDRESS}`)
    // Balances: both rows of the balances region have an amount (the failed and the update states have none).
    const balances = page.getByRole('region', { name: '잔액' })
    await expect(balances.getByText(/\d[\d,.]*\s*ETH/).first()).toBeVisible({ timeout: LIMIT_MS })
    await expect(balances.getByText(/\d[\d,.]*\s*USDC/).first()).toBeVisible({ timeout: LIMIT_MS })
    // History: rows, or the empty state. The failed state is neither.
    const rows = page.locator('tbody tr')
    await expect(rows.first().or(page.getByText('아직 거래가 없어요'))).toBeVisible({ timeout: LIMIT_MS })
    viewerMs = Date.now() - started
    await expect(page.getByText('잔액을 불러오지 못했어요')).toHaveCount(0)
    await expect(page.getByText('내역을 불러오지 못했어요')).toHaveCount(0)
    viewerLcp = await lcp(page)

    // The transaction page, opened by its link as a new page load: it reads the chain through the API.
    if ((await rows.count()) > 0) {
      const href = await rows.first().locator('a').first().getAttribute('href')
      expect(href, 'the first row links to /tx#<hash>').toMatch(/\/tx#0x[0-9a-fA-F]{64}$/)
      if (!href) throw new Error('unreachable')
      const txStarted = Date.now()
      await page.goto(href)
      const detail = page.getByRole('region', { name: '거래 상세' })
      await expect(detail.getByText(/확정|실패/).first()).toBeVisible({ timeout: LIMIT_MS })
      // The amount and its unit: the block number, the time and the hash have digits too.
      await expect(detail).toContainText(/\d[\d,.]*\s+(ETH|USDC)/, { timeout: LIMIT_MS })
      txMs = Date.now() - txStarted
    } else {
      testInfo.annotations.push({
        type: 'warning',
        description: 'no history rows: the transaction page was not opened',
      })
    }
    expect(seen.csp, 'CSP violations').toEqual([])
    expect(seen.errors, 'page errors').toEqual([])
    expect(viewerMs).toBeLessThanOrEqual(LIMIT_MS)
  } finally {
    // The numbers of this run, also of a failed one, in the shape `evidence emit --results` reads (ResultInput[]).
    const result = (
      metric: string,
      value: number,
      unit: string,
      threshold: { op: '<=' | '=='; value: number } | null,
    ) => ({
      metric,
      value,
      unit,
      threshold,
      n: 1,
      window: 'one run',
    })
    mkdirSync('test-results', { recursive: true })
    writeFileSync(
      'test-results/viewer-smoke.json',
      JSON.stringify(
        [
          ...(viewerMs === null
            ? []
            : [
                result('Viewer ready, balances and history', viewerMs / 1000, 's', {
                  op: '<=',
                  value: LIMIT_MS / 1000,
                }),
              ]),
          ...(txMs === null
            ? []
            : [result('Transaction page ready', txMs / 1000, 's', { op: '<=', value: LIMIT_MS / 1000 })]),
          result('CSP violations', seen.csp.length, 'count', { op: '==', value: 0 }),
          result('Page errors', seen.errors.length, 'count', { op: '==', value: 0 }),
          ...(viewerLcp === null ? [] : [result('Viewer LCP', viewerLcp / 1000, 's', null)]),
          // A pass after a retry is still a flaky run: the number says so.
          result('Retries used', testInfo.retry, 'count', null),
        ],
        null,
        2,
      ),
    )
  }
})
