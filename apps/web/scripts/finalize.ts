// Post-build step for build/client (run by `pnpm build`). Static Assets rules this satisfies (ADR-0001):
// - `not_found_handling: "404-page"` serves the nearest `404.html` with status 404, so the prerendered 404 pages are renamed.
// - the SPA shell React Router writes as index.html is dropped (the prerendered landing page at `/` is kept).
// - _headers gets the CSP script hashes of the built HTML (inline scripts cannot use a nonce on a static site), the API
//   origin of this build, and X-Robots-Tag: noindex unless WEB_ENV=production.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const MAX_HEADER_LINE = 2000 // Workers Static Assets limit per _headers line
const STAGING_API_ORIGIN = 'https://vaultme-api-staging.gurwo1007.workers.dev'

export interface HeaderOptions {
  scriptHashes: string[]
  apiOrigin: string
  noindex: boolean
}

// JSON-LD blocks are data, not executable: the browser does not apply script-src to them, so they need no hash.
export function inlineScriptHashes(html: string): string[] {
  const hashes = new Set<string>()
  for (const m of html.matchAll(
    /<script(?![^>]*\ssrc=)(?![^>]*\stype="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g,
  )) {
    hashes.add(
      `'sha256-${createHash('sha256')
        .update(m[1] ?? '')
        .digest('base64')}'`,
    )
  }
  return [...hashes]
}

export function fillHeaders(template: string, { scriptHashes, apiOrigin, noindex }: HeaderOptions): string {
  for (const p of ['__SCRIPT_HASHES__', '__API_ORIGIN__', '__X_ROBOTS_TAG__']) {
    if (!template.includes(p)) throw new Error(`_headers has no ${p}`)
  }
  const out = template
    .replaceAll('__SCRIPT_HASHES__', scriptHashes.join(' '))
    .replaceAll('__API_ORIGIN__', apiOrigin)
    .replace(/^[ \t]*__X_ROBOTS_TAG__\n/m, noindex ? '  X-Robots-Tag: noindex\n' : '')
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

/** Staging and local builds are noindex; only WEB_ENV=production serves indexable pages. */
export function finalize(dir: string, env: Record<string, string | undefined> = process.env) {
  // `/404/index.html` -> `/404.html`, `/en/404/index.html` -> `/en/404.html`
  for (const prefix of ['', 'en']) {
    const from = join(dir, prefix, '404', 'index.html')
    if (!existsSync(from)) throw new Error(`missing prerendered ${from}`)
    renameSync(from, join(dir, prefix, '404.html'))
    rmSync(join(dir, prefix, '404'), { recursive: true })
  }
  // The SPA shell (written when `/` is prerendered) would be served with status 200 and widens the CSP: drop it.
  rmSync(join(dir, '__spa-fallback.html'), { force: true })
  // The SPA shell has no page content. Once the landing page is prerendered at `/`, index.html is that page: keep it.
  const index = join(dir, 'index.html')
  if (existsSync(index) && !/<main[\s>]/.test(readFileSync(index, 'utf8'))) rmSync(index)
  const hashes = [...new Set(htmlFiles(dir).flatMap((f) => inlineScriptHashes(readFileSync(f, 'utf8'))))]
  const headers = join(dir, '_headers')
  const apiOrigin = env.WEB_API_ORIGIN ?? STAGING_API_ORIGIN
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(apiOrigin))
    throw new Error(`WEB_API_ORIGIN must be an https origin, got ${apiOrigin}`)
  const options = { scriptHashes: hashes, apiOrigin, noindex: env.WEB_ENV !== 'production' }
  writeFileSync(headers, fillHeaders(readFileSync(headers, 'utf8'), options))
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  finalize(fileURLToPath(new URL('../build/client', import.meta.url)))
