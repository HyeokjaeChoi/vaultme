import { AsyncLocalStorage } from 'node:async_hooks' // compatibility flag nodejs_als (wrangler.jsonc), also needed by @sentry/cloudflare
import { scrubString } from '@vaultme/contracts'

/** One JSON line per event (Q56). Fields are plain values; the request id stands in for any user identifier. */
type Fields = Record<string, string | number | boolean | null | undefined>

const requestId = new AsyncLocalStorage<string>()

/** Runs `fn` so every `logEvent` inside it (also after awaits) carries `id`. */
export const withRequestId = <T>(id: string, fn: () => T): T => requestId.run(id, fn)

/**
 * Writes `{level, event, requestId, ...fields}` as one line. Every string field goes through `scrubString` as a last guard:
 * an address, tx hash, key, push token or phrase never reaches Workers Logs, even when a caller passes one by mistake.
 */
export function logEvent(level: 'info' | 'warn' | 'error', event: string, fields: Fields = {}): void {
  const clean = Object.fromEntries(
    Object.entries(fields)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, typeof v === 'string' ? scrubString(v) : v]),
  )
  const line = JSON.stringify({ level, event, requestId: requestId.getStore(), ...clean })
  if (level === 'info') console.log(line)
  else console[level](line)
}
