// Usage (from the repo root, node 24):
//   node packages/perf/src/cli.ts hermes <expo export dir> <out.json>
//   STAGING_API_URL=... node --experimental-transform-types packages/perf/src/cli.ts latency <out.json>    (prints the table; CI adds it to the job summary)
//   node packages/perf/src/cli.ts baseline --lhci-desktop <dir> --lhci-mobile <dir> --hermes <json> --api <json> --out docs/perf --commit <sha> --origin <text>
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { buildBaseline, latencyTable, renderBaseline, type Baseline, type JsBudgetRow } from './baseline.ts'
import { hermesSizes, readLhrDir, type HermesSizes } from './summarize.ts'

// N per endpoint (ADR-0019): 20 + 20 + 5 calls plus 1 warm-up rpc and 1 token. The install limit is 60 per 60 s, the IP limit 300.
// History is 3 Etherscan calls per request against 2.5 calls/s, so 5 calls spaced 31 s apart use 15 calls in about 2 minutes.
const N = { health: 20, rpc: 20, history: 5 }
const HISTORY_GAP_MS = 31_000
// The public test vector address of the repo (apps/web/e2e/fixture-api.ts): a Sepolia address with real history, not a user.
const ADDRESS = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'

const readJson = (file: string): unknown => JSON.parse(readFileSync(file, 'utf8'))
const [cmd, ...rest] = process.argv.slice(2)

if (cmd === 'hermes') {
  const [dist, out] = rest
  if (!dist || !out) throw new Error('usage: hermes <expo export dir> <out.json>')
  writeFileSync(out, JSON.stringify(hermesSizes(dist)))
} else if (cmd === 'latency') {
  const [out] = rest
  const baseUrl = process.env.STAGING_API_URL
  if (!out || !baseUrl) throw new Error('usage: STAGING_API_URL=<url> latency <out.json>')
  const web = readJson(new URL('../../../apps/web/package.json', import.meta.url).pathname) as { version: string }
  // Imported here: @vaultme/api-client needs --experimental-transform-types (parameter properties), the other commands run on plain node.
  const { measureApi } = await import('./latency.ts')
  const api = await measureApi({
    baseUrl: baseUrl.replace(/\/+$/, ''),
    appVersion: web.version,
    n: N,
    address: ADDRESS,
    historyGapMs: HISTORY_GAP_MS,
  })
  writeFileSync(out, JSON.stringify({ ...api, address: ADDRESS, historyGapMs: HISTORY_GAP_MS }))
  console.log(latencyTable(api))
  // A run where an endpoint never answered is a failed run, not a baseline.
  if (Object.values(api).some((e) => e.ok === 0)) process.exitCode = 1
} else if (cmd === 'baseline') {
  const { values: v } = parseArgs({
    args: rest,
    options: {
      'lhci-desktop': { type: 'string' },
      'lhci-mobile': { type: 'string' },
      hermes: { type: 'string' },
      api: { type: 'string' },
      out: { type: 'string' },
      commit: { type: 'string' },
      origin: { type: 'string' },
    },
  })
  const [desktop, mobile, hermes, api, out, commit, origin] = [
    v['lhci-desktop'],
    v['lhci-mobile'],
    v.hermes,
    v.api,
    v.out,
    v.commit,
    v.origin,
  ]
  if (!desktop || !mobile || !hermes || !api || !out || !commit || !origin)
    throw new Error('baseline: all options are required')
  const baseline: Baseline = buildBaseline({
    measuredAt: new Date().toISOString().slice(0, 10),
    commit,
    origin,
    desktop: readLhrDir(desktop),
    mobile: readLhrDir(mobile),
    jsBudget: readJson(join(desktop, 'js-budget.json')) as JsBudgetRow[],
    hermes: readJson(hermes) as HermesSizes,
    api: readJson(api) as Baseline['api'],
  })
  writeFileSync(join(out, 'baseline.json'), `${JSON.stringify(baseline, null, 2)}\n`)
  writeFileSync(join(out, 'baseline.md'), renderBaseline(baseline))
} else {
  throw new Error('usage: cli.ts hermes | latency | baseline')
}
