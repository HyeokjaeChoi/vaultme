// Emit docs/openapi/v1.json from the zod routes. `--check` fails when the committed file is stale.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from '../src/app.ts'

const out = join(import.meta.dirname, '../../../docs/openapi/v1.json')
const doc = app.getOpenAPI31Document({
  openapi: '3.1.0',
  info: { title: 'VaultMe API', version: 'v1' },
})
const json = JSON.stringify(doc, null, 2) + '\n'

if (process.argv.includes('--check')) {
  let current = ''
  try {
    current = readFileSync(out, 'utf8')
  } catch {
    // missing file counts as stale
  }
  if (current !== json) {
    console.error('docs/openapi/v1.json is out of date. Run: pnpm --filter @vaultme/api openapi')
    process.exit(1)
  }
} else {
  writeFileSync(out, json)
}
