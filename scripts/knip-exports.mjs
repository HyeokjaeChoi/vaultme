// Unused-export ratchet. Reason: 121 findings existed when exports were first checked (#305); fixing all at once is too big.
// Removal condition: scripts/knip-exports.baseline.json is empty, then run plain `knip --production --include exports,types` and delete this file.
// Run `node scripts/knip-exports.mjs --update` after you fix findings, to shrink the baseline.
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const baselinePath = new URL('./knip-exports.baseline.json', import.meta.url)
// knip exits 1 when it finds issues; only a missing/invalid JSON report is a real failure.
const run = spawnSync('pnpm', ['exec', 'knip', '--production', '--include', 'exports,types', '--reporter', 'json'], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
})
let report
try {
  report = JSON.parse(run.stdout)
} catch {
  console.error(`knip produced no JSON report:\n${run.stdout}\n${run.stderr}`)
  process.exit(2)
}

const found = new Set()
for (const f of report.issues)
  for (const kind of ['exports', 'types']) for (const e of f[kind] ?? []) found.add(`${f.file}:${e.name}`)
const current = [...found].sort()

if (process.argv.includes('--update')) {
  writeFileSync(baselinePath, JSON.stringify(current, null, 2) + '\n')
  console.log(`Baseline written: ${current.length} entries.`)
  process.exit(0)
}

const baseline = new Set(JSON.parse(readFileSync(baselinePath, 'utf8')))
const added = current.filter((k) => !baseline.has(k))
const gone = [...baseline].filter((k) => !found.has(k))
if (added.length) console.error(`New unused exports (remove the export or the dead code):\n  ${added.join('\n  ')}`)
if (gone.length)
  console.error(
    `Fixed, remove from scripts/knip-exports.baseline.json (node scripts/knip-exports.mjs --update):\n  ${gone.join('\n  ')}`,
  )
if (added.length || gone.length) process.exit(1)
console.log(`Unused exports: ${current.length}, all in the baseline.`)
