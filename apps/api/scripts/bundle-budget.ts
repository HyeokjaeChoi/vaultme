// Worker bundle size budget (API-10): a bigger bundle starts slower. Builds the Worker the way `wrangler deploy` does (dry run, nothing is
// uploaded) and fails when the script is over the budget in bundle-budget.json. Budget = measured size + 25 %. After an intended growth,
// measure again (`pnpm bundle:budget` prints both sizes), set `measured` and `budget` (= ceil(measured * 1.25)) and say why in the PR.
// Cloudflare's own limit is far away (64 MiB uncompressed, no compressed limit, read 2026-11-15), so this budget is ours, not theirs.
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

type Sizes = { rawBytes: number; gzipBytes: number }
const file = JSON.parse(readFileSync('scripts/bundle-budget.json', 'utf8')) as { measured: Sizes; budget: Sizes }

mkdirSync('node_modules/.cache', { recursive: true })
const out = mkdtempSync('node_modules/.cache/bundle-budget-')
try {
  execFileSync('pnpm', ['exec', 'wrangler', 'deploy', '--dry-run', '--outdir', out], {
    stdio: ['ignore', 'ignore', 'inherit'],
  }) // stdout is wrangler's table; its errors go to stderr and stay visible
  const script = readFileSync(`${out}/index.js`)
  const now: Sizes = { rawBytes: script.length, gzipBytes: gzipSync(script).length }
  const rows = (['rawBytes', 'gzipBytes'] as const).map((k) => ({
    k,
    now: now[k],
    ...{ budget: file.budget[k], measured: file.measured[k] },
  }))
  for (const r of rows)
    console.log(`${r.k}: ${String(r.now)} (measured ${String(r.measured)}, budget ${String(r.budget)})`)
  const over = rows.filter((r) => r.now > r.budget)
  if (over.length > 0) {
    const what = over.map((r) => `${r.k} ${String(r.now)} > ${String(r.budget)}`).join('; ')
    console.error(`bundle:budget failed: ${what}. See the header of scripts/bundle-budget.ts.`)
    process.exitCode = 1
  }
} finally {
  rmSync(out, { recursive: true, force: true })
}
