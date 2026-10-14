import { z } from 'zod'

export const APP_VERSION_HEADER = 'X-App-Version'

// Dotted numeric version, for example 1.2.3 (Q53).
export const AppVersion = z.string().regex(/^\d+(\.\d+){0,2}$/)
export type AppVersion = z.infer<typeof AppVersion>

export const AppVersionHeader = z.object({ 'x-app-version': AppVersion })

/** True when `version` is lower than `min`. Missing parts count as 0. */
export function isBelow(version: string, min: string): boolean {
  const a = version.split('.').map(Number)
  const b = min.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0)
    if (d !== 0) return d < 0
  }
  return false
}
