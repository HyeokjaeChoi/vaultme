// Post-build step for build/client (run by `pnpm build`). Static Assets rules this satisfies (ADR-0001):
// - `not_found_handling: "404-page"` serves the nearest `404.html` with status 404, so the prerendered pages are renamed `x.html`.
// - the SPA shell React Router writes as index.html is dropped (the prerendered landing page at `/` is kept).
// - _headers gets the CSP script hashes of the built HTML (inline scripts cannot use a nonce on a static site), the API
//   origin of this build, and X-Robots-Tag: noindex unless WEB_ENV=production.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const MAX_HEADER_LINE = 2000 // Workers Static Assets limit per _headers line
const STAGING_API_ORIGIN = 'https://vaultme-api-staging.gurwo1007.workers.dev'

/**
 * The API origin of a build: WEB_API_ORIGIN, default the staging API. The app calls it (vite.config.ts) and the CSP allows it.
 * A production build never gets the staging API, by default or by name: it would read staging data (#492, ADR-0025).
 */
export function apiOrigin(env: Record<string, string | undefined> = process.env): string {
  const origin = env.WEB_API_ORIGIN ?? STAGING_API_ORIGIN
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(origin)) throw new Error(`WEB_API_ORIGIN must be an https origin, got ${origin}`)
  // Host names ignore case, and a trailing dot names the same host.
  if (env.WEB_ENV === 'production' && origin.toLowerCase().replace(/\.$/, '') === STAGING_API_ORIGIN)
    throw new Error(
      'A production build needs WEB_API_ORIGIN set to the production API, not unset and not the staging API',
    )
  return origin
}

/** Cloudflare Web Analytics beacon token of a build (WEB_ANALYTICS_TOKEN, ADR-0012). Empty: no beacon (local, CI). It is a public id, not a secret. */
export function analyticsToken(env: Record<string, string | undefined> = process.env): string {
  const token = env.WEB_ANALYTICS_TOKEN ?? ''
  if (token !== '' && !/^[0-9a-f]{32}$/.test(token)) throw new Error('WEB_ANALYTICS_TOKEN must be 32 hex characters')
  return token
}

/** The beacon tag (Cloudflare manual setup). Added to the built HTML here, not in a route, so no screen code changes; an external script needs no CSP hash. */
export function beaconTag(token: string): string {
  return `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${JSON.stringify({ token })}'></script>`
}

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

const jsLiteral = (v: unknown) =>
  JSON.stringify(v).replace(/[<>&\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)

/** The code of `preloadScript`, without the tag. */
export function preloadCode(files: string[]): string {
  return `(function(){var h;try{h=decodeURIComponent(location.hash.slice(1)).trim()}catch(e){return}if(!/^0x[0-9a-fA-F]{64}$/.test(h))return;for(var f of ${jsLiteral(files)}){var l=document.createElement('link');l.rel='modulepreload';l.href=f;document.head.append(l)}})()`
}

/**
 * An inline script for the /tx pages: a link with a valid hash (the same test as BOOT_SCRIPT in routes/tx.tsx) starts loading the
 * lazy chunks while the page boots. Without it the first read waits for the page's own JS, then for these chunks, one after the
 * other (#504). The fragment never reaches the server, so only the browser can decide this; a page without a hash loads nothing
 * more, which keeps the JS budget of the shell (ADR-0042). The chunk imports its own dependencies (modulepreload follows them).
 */
export function preloadScript(files: string[]): string {
  return `<script>${preloadCode(files)}</script>`
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

/** Directories (relative to `dir`, deepest first) that hold a prerendered `index.html`. Not the root, not assets. */
function pageDirs(dir: string, rel = ''): string[] {
  return readdirSync(join(dir, rel), { withFileTypes: true }).flatMap((e) => {
    if (!e.isDirectory() || (rel === '' && e.name === 'assets')) return []
    const sub = join(rel, e.name)
    return [...pageDirs(dir, sub), ...(existsSync(join(dir, sub, 'index.html')) ? [sub] : [])]
  })
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
  const api = apiOrigin(env) // first: a wrong origin must fail before any file changes (#492)
  for (const prefix of ['', 'en']) {
    const from = join(dir, prefix, '404', 'index.html')
    if (!existsSync(from)) throw new Error(`missing prerendered ${from}`)
  }
  // Every prerendered page `x/index.html` -> `x.html`: `/404.html` is what `404-page` serves, and `/address` is then
  // served as is, not redirected to `/address/` (Static Assets html_handling auto-trailing-slash).
  // Only a leaf page: `en/index.html` (holding en/404.html, en/address.html) stays, since `/en` -> `/en/` (_redirects).
  for (const page of pageDirs(dir)) {
    if (readdirSync(join(dir, page)).length !== 1) continue
    renameSync(join(dir, page, 'index.html'), join(dir, `${page}.html`))
    rmSync(join(dir, page), { recursive: true })
  }
  // The SPA shell (written when `/` is prerendered) would be served with status 200 and widens the CSP: drop it.
  rmSync(join(dir, '__spa-fallback.html'), { force: true })
  // The SPA shell has no page content. Once the landing page is prerendered at `/`, index.html is that page: keep it.
  const index = join(dir, 'index.html')
  if (existsSync(index) && !/<main[\s>]/.test(readFileSync(index, 'utf8'))) rmSync(index)
  // The lazy `client` chunk (the API client and, through it, what a read needs) is preloaded on /tx for a valid hash (#504).
  const tx = ['tx.html', 'en/tx.html'].filter((f) => existsSync(join(dir, f)))
  if (tx.length > 0) {
    const chunks = readdirSync(join(dir, 'assets')).filter((f) => /^client-.+\.js$/.test(f))
    if (chunks.length !== 1) throw new Error(`expected one client chunk in assets, found ${String(chunks.length)}`)
    const script = preloadScript(chunks.map((f) => `/assets/${f}`))
    for (const f of tx) {
      const html = readFileSync(join(dir, f), 'utf8')
      if (!html.includes('</head>')) throw new Error(`${f} has no </head>`)
      writeFileSync(join(dir, f), html.replace('</head>', `${script}</head>`))
    }
  }
  // Staging only: a production build never carries the beacon, even if the token is set (ADR-0012, #254).
  const token = env.WEB_ENV === 'production' ? '' : analyticsToken(env)
  if (token)
    for (const f of htmlFiles(dir)) {
      const html = readFileSync(f, 'utf8')
      if (!html.includes('</head>')) throw new Error(`${f} has no </head>`)
      writeFileSync(f, html.replace('</head>', `${beaconTag(token)}</head>`))
    }
  const hashes = [...new Set(htmlFiles(dir).flatMap((f) => inlineScriptHashes(readFileSync(f, 'utf8'))))]
  const headers = join(dir, '_headers')
  const options = { scriptHashes: hashes, apiOrigin: api, noindex: env.WEB_ENV !== 'production' }
  writeFileSync(headers, fillHeaders(readFileSync(headers, 'utf8'), options))
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  finalize(fileURLToPath(new URL('../build/client', import.meta.url)))
