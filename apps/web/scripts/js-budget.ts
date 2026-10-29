// JS budget check (ADR-0018): runs after `lhci autorun`, reads the saved Lighthouse reports and counts the compressed
// body of the app's own JS per page. Response headers are not counted (they are a server setting, not code weight).
// Usage: node scripts/js-budget.ts [lhci dir = .lighthouseci] [build dir = build/client]
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

export const STATIC_LIMIT = 102_400
export const VIEWER_LIMIT = 153_600
// gzip -9 is what a static host can do at best; the exact level of the edge may differ by a few hundred bytes.
const GZIP_LEVEL = 9

/** Viewer routes (`/address`, `/tx`, `/en/...`) have the larger limit; the landing and 404 pages the smaller one. */
export function limitFor(url: string): number {
  return /^\/(en\/)?(address|tx)$/.test(new URL(url).pathname) ? VIEWER_LIMIT : STATIC_LIMIT
}

export interface Lhr {
  requestedUrl?: string
  finalDisplayedUrl?: string
  audits: Record<string, { details?: { items?: { url?: string; resourceType?: string; statusCode?: number }[] } }>
}

/** Same-origin JS files a page loaded (inline scripts are in the HTML, not here), as paths in the build directory. */
export function scriptPaths(lhr: Lhr): string[] {
  const page = new URL(lhr.finalDisplayedUrl ?? lhr.requestedUrl ?? '')
  const items = lhr.audits['network-requests']?.details?.items ?? []
  const paths = items.flatMap((i) => {
    if (i.resourceType !== 'Script' || !i.url || (i.statusCode ?? 200) >= 400) return []
    const u = new URL(i.url)
    return u.origin === page.origin ? [decodeURIComponent(u.pathname)] : []
  })
  return [...new Set(paths)]
}

/** Compressed size of one built file. Throws when the URL has no file or leaves the build directory. */
export function gzipSize(path: string, buildDir: string): number {
  const root = resolve(buildDir)
  const file = resolve(root, `.${path}`)
  if (!file.startsWith(root + sep) || !existsSync(file)) throw new Error(`${path} is not a file in ${buildDir}`)
  return gzipSync(readFileSync(file), { level: GZIP_LEVEL }).length
}

export interface PageResult {
  url: string
  bytes: number
  limit: number
  files: number
}

/** One row per page URL. Several runs of a URL: the largest one counts. */
export function measure(lhrs: Lhr[], buildDir: string): PageResult[] {
  const sizes = new Map<string, number>()
  const files = new Map<string, number>()
  const cache = new Map<string, number>()
  for (const lhr of lhrs) {
    const url = lhr.requestedUrl ?? lhr.finalDisplayedUrl ?? ''
    const paths = scriptPaths(lhr)
    let bytes = 0
    for (const p of paths) {
      if (!cache.has(p)) cache.set(p, gzipSize(p, buildDir))
      bytes += cache.get(p) ?? 0
    }
    if (bytes >= (sizes.get(url) ?? -1)) {
      sizes.set(url, bytes)
      files.set(url, paths.length)
    }
  }
  return [...sizes].map(([url, bytes]) => ({ url, bytes, limit: limitFor(url), files: files.get(url) ?? 0 }))
}

export function report(rows: PageResult[]): { text: string; failed: boolean } {
  const lines = rows.map((r) => {
    const over = r.bytes > r.limit
    return `${over ? 'FAIL' : 'ok  '} ${r.url}  ${String(r.bytes)} / ${String(r.limit)} B gzip (${String(r.files)} files)`
  })
  return { text: lines.join('\n'), failed: rows.some((r) => r.bytes > r.limit) }
}

export function readLhrs(dir: string): Lhr[] {
  const names = readdirSync(dir).filter((n) => /^lhr-.*\.json$/.test(n))
  if (names.length === 0) throw new Error(`no lhr-*.json in ${dir}; run lhci collect first`)
  return names.map((n) => JSON.parse(readFileSync(join(dir, n), 'utf8')) as Lhr)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [dir = '.lighthouseci', build = 'build/client'] = process.argv.slice(2)
  const { text, failed } = report(measure(readLhrs(dir), build))
  console.log(text)
  if (failed) {
    console.error('JS budget exceeded (ADR-0018).')
    process.exitCode = 1
  }
}
