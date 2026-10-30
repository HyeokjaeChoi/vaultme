import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** Nearest-rank percentile (p in 1..100) of a list of numbers; `null` for an empty list. */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)] ?? null
}

// --- Lighthouse (web) ---

export type PageScores = {
  /** Path only (`/en/`), not the origin of the local server. */
  url: string
  runs: number
  /** Median category scores, 0 to 100. */
  performance: number
  accessibility: number
  bestPractices: number
  seo: number
  /** Medians, the same aggregation the lighthouserc assertions use. */
  lcpMs: number
  cls: number
  tbtMs: number
}

type Lhr = {
  requestedUrl?: string
  categories: Record<string, { score: number | null }>
  audits: Record<string, { numericValue?: number }>
}

const median = (v: number[]) => percentile(v, 50) ?? 0

/** One row per URL from the saved `lhr-*.json` reports of `lhci collect`. */
export function summarizeLhrs(lhrs: Lhr[]): PageScores[] {
  const byUrl = new Map<string, Lhr[]>()
  for (const l of lhrs) {
    const u = new URL(l.requestedUrl ?? '')
    const key = u.pathname + u.search
    byUrl.set(key, [...(byUrl.get(key) ?? []), l])
  }
  return [...byUrl]
    .map(([url, runs]) => {
      const cat = (id: string) => median(runs.map((r) => Math.round((r.categories[id]?.score ?? 0) * 100)))
      const audit = (id: string) => median(runs.map((r) => r.audits[id]?.numericValue ?? 0))
      return {
        url,
        runs: runs.length,
        performance: cat('performance'),
        accessibility: cat('accessibility'),
        bestPractices: cat('best-practices'),
        seo: cat('seo'),
        lcpMs: Math.round(audit('largest-contentful-paint')),
        cls: Math.round(audit('cumulative-layout-shift') * 1000) / 1000,
        tbtMs: Math.round(audit('total-blocking-time')),
      }
    })
    .sort((a, b) => a.url.localeCompare(b.url))
}

export function readLhrDir(dir: string): PageScores[] {
  const names = readdirSync(dir).filter((n) => /^lhr-.*\.json$/.test(n))
  if (names.length === 0) throw new Error(`no lhr-*.json in ${dir}`)
  return summarizeLhrs(names.map((n) => JSON.parse(readFileSync(join(dir, n), 'utf8')) as Lhr))
}

// --- Hermes (mobile) ---

export type HermesSizes = { ios: number; android: number }

function findHbc(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) return findHbc(p)
    return n.endsWith('.hbc') ? [p] : []
  })
}

/** Bytes of the one Hermes bundle per platform in an `expo export` directory. Throws unless there is exactly one each. */
export function hermesSizes(distDir: string): HermesSizes {
  const files = findHbc(distDir)
  const pick = (platform: string) => {
    const f = files.filter((p) => p.split(/[\\/]/).includes(platform))
    if (f.length !== 1 || f[0] === undefined) throw new Error(`expected one .hbc for ${platform} in ${distDir}`)
    return statSync(f[0]).size
  }
  return { ios: pick('ios'), android: pick('android') }
}
