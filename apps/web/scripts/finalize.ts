// Post-build step for build/client (run by `pnpm build`). Static Assets rules this satisfies (ADR-0001):
// - `not_found_handling: "404-page"` serves the nearest `404.html` with status 404, so the prerendered 404 pages are renamed.
// - the SPA shell React Router writes as index.html is dropped: with no landing page yet, `/` must be a real 404 too.
// - _headers gets the CSP script hashes of the built HTML (inline scripts cannot use a nonce on a static site).
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HASH_PLACEHOLDER = '__SCRIPT_HASHES__'
const MAX_HEADER_LINE = 2000 // Workers Static Assets limit per _headers line

export function inlineScriptHashes(html: string): string[] {
  const hashes = new Set<string>()
  for (const m of html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    hashes.add(
      `'sha256-${createHash('sha256')
        .update(m[1] ?? '')
        .digest('base64')}'`,
    )
  }
  return [...hashes]
}

export function fillHeaders(template: string, hashes: string[]): string {
  if (!template.includes(HASH_PLACEHOLDER)) throw new Error(`_headers has no ${HASH_PLACEHOLDER}`)
  const out = template.replaceAll(HASH_PLACEHOLDER, hashes.join(' '))
  const long = out.split('\n').find((l) => l.length > MAX_HEADER_LINE)
  if (long) throw new Error(`_headers line is ${String(long.length)} characters, limit ${String(MAX_HEADER_LINE)}`)
  return out
}

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (name === 'assets') return []
    return statSync(p).isDirectory() ? htmlFiles(p) : name.endsWith('.html') ? [p] : []
  })
}

export function finalize(dir: string) {
  // `/404/index.html` -> `/404.html`, `/en/404/index.html` -> `/en/404.html`
  for (const prefix of ['', 'en']) {
    const from = join(dir, prefix, '404', 'index.html')
    if (!existsSync(from)) throw new Error(`missing prerendered ${from}`)
    renameSync(from, join(dir, prefix, '404.html'))
    rmSync(join(dir, prefix, '404'), { recursive: true })
  }
  rmSync(join(dir, 'index.html'), { force: true })
  const hashes = [...new Set(htmlFiles(dir).flatMap((f) => inlineScriptHashes(readFileSync(f, 'utf8'))))]
  const headers = join(dir, '_headers')
  writeFileSync(headers, fillHeaders(readFileSync(headers, 'utf8'), hashes))
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  finalize(fileURLToPath(new URL('../build/client', import.meta.url)))
