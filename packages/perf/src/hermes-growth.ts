// Hermes bundle growth against `main` (gate MOB-3). The 11 MiB limit fails `export:check`; this warns earlier: a bundle that grew by
// more than 100 KiB since `main` is a change worth a look while there is still room. Pure code; `cli.ts hermes-growth` prints it.
import { HERMES_LIMIT } from './baseline.ts'
import type { HermesSizes } from './summarize.ts'

export const GROWTH_LIMIT = 100 * 1024
const PLATFORMS = ['ios', 'android'] as const

export type Growth = {
  platform: (typeof PLATFORMS)[number]
  base: number
  current: number
  delta: number
  warn: boolean
}

/** `current` against `base` (the `perf-hermes.json` of `main`) per platform. A delta of exactly the limit is not a warning. */
export function hermesGrowth(current: HermesSizes, base: HermesSizes): Growth[] {
  return PLATFORMS.map((platform) => {
    // A file without a size would give NaN, and NaN is never above the limit: the gate would pass without looking.
    for (const [name, sizes] of [
      ['current', current],
      ['base', base],
    ] as const)
      if (!Number.isFinite(sizes[platform])) throw new Error(`hermes-growth: ${name} has no number for ${platform}`)
    const delta = current[platform] - base[platform]
    return { platform, base: base[platform], current: current[platform], delta, warn: delta > GROWTH_LIMIT }
  })
}

const kib = (b: number): string => `${(b / 1024).toFixed(1)} KiB`
const signed = (b: number): string => `${b >= 0 ? '+' : '-'}${kib(Math.abs(b))}`

/** The table for the job summary. */
export function growthTable(rows: Growth[]): string {
  return [
    '| Platform | main | This build | Change | Of the 11 MiB limit | Result |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows.map(
      (r) =>
        `| ${r.platform} | ${String(r.base)} B | ${String(r.current)} B | ${signed(r.delta)} | ${((r.current / HERMES_LIMIT) * 100).toFixed(1)} % | ${r.warn ? 'WARNING' : 'ok'} |`,
    ),
    '',
  ].join('\n')
}

/** One `::warning::` line per platform over the limit. Workflow commands are read from stdout only, so these never go to the summary file. */
export function growthWarnings(rows: Growth[]): string[] {
  return rows
    .filter((r) => r.warn)
    .map(
      (r) =>
        `::warning title=Hermes bundle grew::${r.platform} grew by ${kib(r.delta)} against main (warning above ${kib(GROWTH_LIMIT)}); now ${String(r.current)} B of ${String(HERMES_LIMIT)} B.`,
    )
}
