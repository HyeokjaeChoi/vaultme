// Removes wallet data from text before it leaves the device or the Worker: Sentry events and breadcrumbs (Q50) and JSON logs (Q56).
// Pattern based on purpose: any string can carry a value we never planned for, so every string is checked, not only known fields.
const PATTERNS: readonly (readonly [RegExp, string])[] = [
  [/0x[0-9a-fA-F]{64,}/g, '[hash]'], // tx hash, calldata
  [/0x[0-9a-fA-F]{40}(?![0-9a-fA-F])/g, '[address]'],
  [/(?<![0-9a-fA-F])[0-9a-fA-F]{64}(?![0-9a-fA-F])/g, '[hash]'], // a private key or hash without 0x
  [/Expo(?:nent)?PushToken\[[^\]]*\]/g, '[push-token]'],
  [/\b(?:[a-z]{3,8}\s+){11,}[a-z]{3,8}\b/gi, '[phrase]'], // 12+ BIP39-length words in a row, any case, any whitespace (12 or 24 words)
]

export const scrubString = (s: string): string => PATTERNS.reduce((acc, [re, to]) => acc.replace(re, to), s)

const MAX_DEPTH = 12

/** Scrubs every string in a JSON-like value. Returns a copy. Deeper than 12 levels (a cycle) is cut. */
function scrubValue(v: unknown, depth = 0): unknown {
  if (typeof v === 'string') return scrubString(v)
  if (typeof v !== 'object' || v === null) return v
  if (depth >= MAX_DEPTH) return '[deep]'
  if (Array.isArray(v)) return v.map((x) => scrubValue(x, depth + 1))
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, scrubValue(x, depth + 1)]))
}

const stripQuery = (url: string): string => url.split(/[?#]/)[0] ?? ''

/** The URL without host, query and fragment. */
const pathOnly = (url: string): string => {
  try {
    return new URL(url).pathname
  } catch {
    return stripQuery(url)
  }
}

type Request = { method?: string; url?: string }

/** Sentry `beforeSend`: no user, no IP inference, no request body, query, cookies or headers, then every string scrubbed. */
export function scrubEvent<T extends object>(event: T): T {
  const out = { ...(event as Record<string, unknown>) }
  delete out.user
  // The SDK sends no IP, but Sentry's server infers one from the connection unless told not to:
  // https://develop.sentry.dev/sdk/data-model/event-payloads/sdk/ (`settings.infer_ip`, `never`).
  const sdk = (out.sdk ?? {}) as { settings?: object }
  out.sdk = { ...sdk, settings: { ...sdk.settings, infer_ip: 'never' } }
  const request = out.request as Request | undefined
  if (request)
    out.request = {
      ...(request.method ? { method: request.method } : {}),
      ...(request.url ? { url: stripQuery(request.url) } : {}),
    }
  return scrubValue(out) as T
}

/** Sentry `beforeBreadcrumb`: a network breadcrumb keeps only the URL path (Q50), every string is scrubbed. */
export function scrubBreadcrumb<T extends object>(crumb: T): T {
  const out = scrubValue(crumb) as { category?: string; data?: { url?: unknown } }
  if (['fetch', 'xhr', 'http'].includes(out.category ?? '') && typeof out.data?.url === 'string')
    out.data.url = pathOnly(out.data.url)
  return out as T
}
