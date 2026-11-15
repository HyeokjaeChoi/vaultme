import { appendFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { gzipSize, limitFor } from '../scripts/js-budget.ts'
import { settled } from './settle'
import { A, fixtureApi, TX } from './fixture-api'

// Lab INP, LCP and CLS of the viewer with data, and the JS it loads with data (#496: gates WEB-3 and WEB-2, ADR-0042).
// Lighthouse opens /address and /tx without a fragment, so it never clicks, never calls the API and never loads the lazy chunks.
// Here the real build runs in Chromium with the Lighthouse mobile CPU (4x slower) and the network as Lighthouse applies it through
// DevTools (request latency 150 ms x 3.75, 1.6 Mbps x 0.9 down, 750 kbps x 0.9 up: DEVTOOLS_*_ADJUSTMENT_FACTOR in lighthouse 12.6.1),
// at 375 px with the desktop user agent (the Figma width; touch and device pixel ratio are not emulated),
// and the fixture API answers as late as its limits in docs/perf/slo.md (rpc 250 ms, history 1000 ms): an API that meets its SLO must
// still give a page that meets Core Web Vitals. INP is the longest interaction: Event Timing entries are grouped by `interactionId`
// and the maximum is taken, which is what web-vitals reports for fewer than 50 interactions (its p98 pick is the maximum), so no
// library is added. Limits: web.dev "good" (https://web.dev/articles/inp, /lcp, /cls), on the median of 3 runs per page.
// LCP and CLS are judged for the load (up to the first click), INP for the clicks; the CLS of the whole visit is shown, not judged.
// Chromium only (a CDP session). Event Timing lists only entries of 16 ms or more: no entry means INP is under 16 ms.
// Only the ko pages are run (the en pages load the same chunks). The /tx flow runs with the internal transfers failing, so its
// LCP and JS are those of the error state of that section; a run needs no retry (playwright.config.ts: `perf` has 0 retries).

const RUNS = 3
const LIMIT = { inp: 200, lcp: 2500, cls: 0.1 } as const
/** ADR-0042: the page with data loads more JS than its limit (about 30 KB over). A warning until the lazy chunks are cut; then set true. */
const WITH_DATA_IS_ERROR = false as boolean // widened so the check below is not a constant condition
const BUILD = fileURLToPath(new URL('../build/client', import.meta.url))
const NETWORK = {
  offline: false,
  latency: 150 * 3.75,
  downloadThroughput: (1.6 * 1024 * 0.9 * 1024) / 8, // bytes per second
  uploadThroughput: (750 * 0.9 * 1024) / 8,
}
const cards = 'section[aria-labelledby="history-title"] li' // 375 px: the cards, the layout of a phone

type Api = Awaited<ReturnType<typeof fixtureApi>>
type Probe = {
  lcp: number
  firstInputs: number
  shifts: { value: number; at: number; recent: boolean }[]
  events: { id: number; duration: number }[]
}
type Run = {
  inp: number
  lcp: number
  cls: number
  /** CLS of the whole visit, the clicks included: shown, not judged. */
  clsAll: number
  interactions: number
  firstInputs: number
  bytes: number
  files: number
}
type Flow = {
  name: string
  start: string
  /** False: a median LCP over its limit is a warning, not a failure (a known gap that has an issue). */
  lcpIsError: boolean
  prepare?: (api: Api) => void
  /** The page shows its data. */
  ready: (page: Page) => Promise<void>
  /** The clicks of a visitor, in order. */
  interact: (page: Page, api: Api) => Promise<void>
}

/** Runs in the page before its scripts: records the last LCP candidate, the layout shifts and the Event Timing entries. */
function probe() {
  const p: Probe = { lcp: 0, firstInputs: 0, shifts: [], events: [] }
  ;(window as unknown as { __probe: Probe }).__probe = p
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) p.lcp = e.startTime
  }).observe({ type: 'largest-contentful-paint', buffered: true })
  new PerformanceObserver((list) => {
    for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[])
      p.shifts.push({ value: e.value, at: e.startTime, recent: e.hadRecentInput })
  }).observe({ type: 'layout-shift', buffered: true })
  new PerformanceObserver((list) => {
    for (const e of list.getEntries() as PerformanceEventTiming[])
      p.events.push({ id: e.interactionId, duration: e.duration })
  }).observe({ type: 'event', durationThreshold: 16, buffered: true } as PerformanceObserverInit) // the lib types lack durationThreshold
  new PerformanceObserver((list) => {
    p.firstInputs += list.getEntries().length
  }).observe({ type: 'first-input', buffered: true })
}

/** CLS: the largest session window (shifts less than 1 s apart, a window at most 5 s long), shifts after a click left out. */
function cls(shifts: Probe['shifts']): number {
  let best = 0
  let sum = 0
  let first = 0
  let last = 0
  for (const s of shifts) {
    if (s.recent) continue
    if (sum > 0 && (s.at - last > 1000 || s.at - first > 5000)) sum = 0
    if (sum === 0) first = s.at
    sum += s.value
    last = s.at
    best = Math.max(best, sum)
  }
  return best
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0

/** INP (the longest interaction) and the number of interactions. Entries with an `interactionId` are clicks, keys and taps; hovers have none. */
function interactionsOf(events: Probe['events']) {
  const done = events.filter((e) => e.id > 0)
  return { inp: Math.max(0, ...done.map((e) => e.duration)), count: new Set(done.map((e) => e.id)).size }
}

const flows: Flow[] = [
  {
    name: 'address',
    start: `/address#${A}`,
    lcpIsError: true,
    ready: async (page) => {
      await expect(page.locator(cards)).toHaveCount(5, { timeout: 30_000 })
    },
    interact: async (page) => {
      await page.getByRole('button', { name: '더 보기' }).click()
      await expect(page.locator(cards)).toHaveCount(14, { timeout: 30_000 })
      await page.getByRole('button', { name: /화면 테마/ }).click()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
      await page.locator(`${cards} a`).first().click() // a row opens /tx: a route change inside the interaction
      await expect(page.getByRole('heading', { name: '거래 상세' })).toBeVisible({ timeout: 30_000 })
    },
  },
  {
    name: 'tx',
    start: `/tx#${TX}`,
    lcpIsError: false, // #504: the largest content paints after the data, about 3.8 s in the lab. Set true when the median is within the limit.
    prepare: (api) => {
      api.internal = 'down'
    },
    ready: async (page) => {
      await expect(page.getByText('내부 이동을 불러오지 못했어요')).toBeVisible({ timeout: 30_000 })
    },
    interact: async (page, api) => {
      api.internal = 'list'
      await page.getByRole('button', { name: '다시 시도' }).click()
      await expect(page.getByText('내부 이동 실패')).toBeVisible({ timeout: 30_000 })
      await page.getByRole('link', { name: '주소로 돌아가기' }).click()
      await expect(page.getByLabel('Sepolia 주소')).toBeVisible({ timeout: 30_000 })
    },
  },
]

async function run(browser: Browser, flow: Flow): Promise<Run> {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } })
  try {
    const page = await context.newPage()
    const api = await fixtureApi(page)
    api.latencyMs = { rpc: 250, history: 1000 }
    flow.prepare?.(api)
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', NETWORK)
    const scripts = new Set<string>()
    page.on('response', (res) => {
      const url = new URL(res.url())
      if (url.hostname === 'localhost' && res.request().resourceType() === 'script')
        scripts.add(decodeURIComponent(url.pathname))
    })
    await page.addInitScript(probe)
    await page.goto(flow.start)
    await flow.ready(page)
    await settled(page)
    await page.waitForTimeout(1000) // the last LCP candidate paints after the data
    const read = () => page.evaluate(() => (window as unknown as { __probe: Probe }).__probe)
    const lcp = (await read()).lcp // before the first click: a click ends LCP
    const clickAt = await page.evaluate(() => performance.now()) // CLS is judged for the load, as LCP: up to here
    const loaded = [...scripts] // what the page loads with its data, before any click
    await flow.interact(page, api)
    await page.waitForTimeout(1000) // Event Timing entries arrive after the next paint
    const p = await read()
    const { inp, count } = interactionsOf(p.events)
    return {
      inp,
      lcp,
      cls: cls(p.shifts.filter((s) => s.at < clickAt)),
      clsAll: cls(p.shifts),
      interactions: count,
      firstInputs: p.firstInputs,
      bytes: loaded.reduce((sum, path) => sum + gzipSize(path, BUILD), 0),
      files: loaded.length,
    }
  } finally {
    await context.close()
  }
}

for (const flow of flows) {
  test(`${flow.name}: lab INP, LCP and CLS with data, and its JS with data (median of ${String(RUNS)})`, async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240_000)
    const runs: Run[] = []
    for (let i = 0; i < RUNS; i++) runs.push(await run(browser, flow))
    const m = {
      inp: median(runs.map((r) => r.inp)),
      lcp: median(runs.map((r) => r.lcp)),
      cls: median(runs.map((r) => r.cls)),
    }
    const bytes = Math.max(...runs.map((r) => r.bytes))
    const path = flow.start.split('#')[0] ?? ''
    const limit = limitFor(`http://localhost${flow.start}`)
    const table = [
      `Lab ${flow.name} (${path} with data; CPU 4x, Lighthouse mobile network, API at its SLO limits; limits INP ${String(LIMIT.inp)} ms, LCP ${String(LIMIT.lcp)} ms, CLS ${String(LIMIT.cls)})`,
      '| run | INP ms | LCP ms | CLS (load) | CLS (with clicks) | interactions | JS gzip B (files) |',
      '|---|---|---|---|---|---|---|',
      ...runs.map(
        (r, i) =>
          `| ${String(i + 1)} | ${String(r.inp)} | ${r.lcp.toFixed(0)} | ${r.cls.toFixed(4)} | ${r.clsAll.toFixed(4)} | ${String(r.interactions)} | ${String(r.bytes)} (${String(r.files)}) |`,
      ),
      `| median | ${String(m.inp)} | ${m.lcp.toFixed(0)} | ${m.cls.toFixed(4)} | ${median(runs.map((r) => r.clsAll)).toFixed(4)} | | ${String(bytes)} of ${String(limit)} |`,
    ].join('\n')
    console.log(table)
    await testInfo.attach('lab-metrics.md', { body: table, contentType: 'text/markdown' })
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### ${table}\n\n`)
    if (bytes > limit)
      console.log(
        `::warning title=Viewer JS with data is over its limit (ADR-0042)::${path} loads ${String(bytes)} B gzip with data, limit ${String(limit)} B (${String(bytes - limit)} B over)`,
      )
    if (WITH_DATA_IS_ERROR) expect.soft(bytes, 'JS with data (ADR-0042)').toBeLessThanOrEqual(limit)
    for (const r of runs) expect(r.firstInputs, 'the Event Timing observer saw no first input').toBeGreaterThan(0)
    expect
      .soft(m.inp, `INP of the runs: ${runs.map((r) => String(r.inp)).join(', ')} ms`)
      .toBeLessThanOrEqual(LIMIT.inp)
    if (flow.lcpIsError)
      expect
        .soft(m.lcp, `LCP of the runs: ${runs.map((r) => r.lcp.toFixed(0)).join(', ')} ms`)
        .toBeLessThanOrEqual(LIMIT.lcp)
    else if (m.lcp > LIMIT.lcp)
      console.log(
        `::warning title=Viewer LCP with data is over its limit (#504)::${path} median LCP ${m.lcp.toFixed(0)} ms (runs ${runs.map((r) => r.lcp.toFixed(0)).join(', ')}), limit ${String(LIMIT.lcp)} ms`,
      )
    expect
      .soft(m.cls, `CLS of the runs: ${runs.map((r) => r.cls.toFixed(4)).join(', ')}`)
      .toBeLessThanOrEqual(LIMIT.cls)
  })
}

// The gate is not blind: the same probe sees a click handler that blocks for 300 ms, and that is over the INP limit.
test('the probe measures a click handler that blocks the page for 300 ms', async ({ page }) => {
  await page.route('**/probe-self-test', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<button id="b" onclick="const t = performance.now(); while (performance.now() - t < 300);">go</button>',
    }),
  )
  await page.addInitScript(probe)
  await page.goto('/probe-self-test')
  await page.locator('#b').click()
  await page.waitForTimeout(500) // the Event Timing entry arrives after the next paint
  const p = await page.evaluate(() => (window as unknown as { __probe: Probe }).__probe)
  expect(interactionsOf(p.events).inp, 'INP of a 300 ms handler').toBeGreaterThan(LIMIT.inp)
})
