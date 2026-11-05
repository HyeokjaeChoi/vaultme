// Drift check (#355): fails when src/db/schema.ts has a change without a committed migration, when the journal and the
// .sql files do not list the same migrations (a .sql nobody generated, or a journal entry whose file is missing), or when
// the snapshots are inconsistent. Runs `drizzle-kit generate` into a temp copy of migrations/, so it writes nothing there.
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'

const sql = (dir: string): string[] => readdirSync(dir).filter((f) => f.endsWith('.sql'))
// Inside node_modules (git-ignored) and relative: drizzle-kit prefixes `out` with `./`, so an absolute path breaks.
mkdirSync('node_modules/.cache', { recursive: true })
const tmp = mkdtempSync('node_modules/.cache/db-check-')
const journal = JSON.parse(readFileSync('migrations/meta/_journal.json', 'utf8')) as { entries: { tag: string }[] }
const tags = journal.entries.map((e) => `${e.tag}.sql`).sort()
const files = sql('migrations').sort()
if (tags.join() !== files.join()) {
  console.error(
    `db:check failed: migrations/meta/_journal.json lists [${tags.join(', ')}] but migrations/ holds [${files.join(', ')}]. Make migrations with \`db:generate\` (\`drizzle-kit generate --custom\` for hand-written SQL).`,
  )
  process.exit(1)
}
try {
  cpSync('migrations', tmp, { recursive: true })
  const run = (cmd: string): void => {
    execFileSync('pnpm', ['exec', 'drizzle-kit', cmd], { stdio: 'inherit', env: { ...process.env, DRIZZLE_OUT: tmp } })
  }
  run('check')
  const before = new Set(sql('migrations'))
  run('generate')
  const fresh = sql(tmp).filter((f) => !before.has(f))
  if (fresh.length > 0) {
    console.error(
      `db:check failed: src/db/schema.ts changed without a migration. Run \`pnpm --filter @vaultme/api db:generate\` and commit the result (${fresh.join(', ')}).`,
    )
    process.exitCode = 1
  }
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
