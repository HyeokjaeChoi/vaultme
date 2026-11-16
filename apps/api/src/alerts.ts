import * as Sentry from '@sentry/cloudflare'
import { count, gte, lt, min } from 'drizzle-orm'
import { nowSeconds } from './auth.ts'
import { getDb } from './db/index.ts'
import { pushUnregister, serverErrors } from './db/schema.ts'
import type { Env } from './env.ts'
import { logEvent } from './log.ts'

type Bindings = Env['Bindings']

/** 5xx answers in the last hour that make the cron report a spike (Q69). Absolute: the Worker keeps no request total to make a ratio from. */
const SERVER_ERROR_ALERT_COUNT = 10
const WINDOW_SECONDS = 3600
const KEEP_SECONDS = 24 * 3600
/** A `push_unregister` row older than this is stuck: the hourly sweep retries it, so a day of failed retries is a dead letter (API-5). */
const STUCK_SECONDS = 24 * 3600

/** Counts one 5xx answer. Only the time is stored. A failed write (D1 down is a likely cause of 5xx) is logged, never thrown. */
export async function recordServerError(env: Bindings): Promise<void> {
  try {
    await getDb(env.DB).insert(serverErrors).values({ at: nowSeconds() })
  } catch {
    logEvent('error', 'server_error_not_counted')
  }
}

/**
 * Hourly cron (Q69). Sends one Sentry event per condition that holds, with a fixed fingerprint so Sentry keeps one issue and its alert rule
 * (email to the owner) fires on it. Two conditions: the 5xx spike, and stuck `push_unregister` rows (the dead letter of Q56, API-5: Alchemy
 * removals that keep failing). The watcher stall has no source here (push comes from the Alchemy webhook, there is no watcher cursor),
 * see docs/decisions.md Q69.
 */
export async function checkAlerts(env: Bindings): Promise<void> {
  const now = nowSeconds()
  const db = getDb(env.DB)
  await db.delete(serverErrors).where(lt(serverErrors.at, now - KEEP_SECONDS))
  const row = await db
    .select({ n: count() })
    .from(serverErrors)
    .where(gte(serverErrors.at, now - WINDOW_SECONDS))
    .get()
  const recent = row?.n ?? 0
  if (recent >= SERVER_ERROR_ALERT_COUNT) {
    logEvent('error', 'alert_5xx_spike', { count: recent })
    Sentry.captureMessage('API 5xx spike', {
      level: 'error',
      fingerprint: ['alert', 'api-5xx-spike'],
      tags: { alert: 'api-5xx-spike' },
      extra: { count_last_hour: recent },
    })
  }
  const stuck = await db
    .select({ n: count(), oldest: min(pushUnregister.createdAt) })
    .from(pushUnregister)
    .where(lt(pushUnregister.createdAt, now - STUCK_SECONDS))
    .get()
  if (stuck !== undefined && stuck.n >= 1) {
    const oldestAge = stuck.oldest === null ? 0 : now - stuck.oldest
    logEvent('error', 'alert_push_unregister_stuck', { count: stuck.n, oldest_age_seconds: oldestAge }) // never the addresses
    Sentry.captureMessage('Push unregister stuck', {
      level: 'error',
      fingerprint: ['alert', 'push-unregister-stuck'],
      tags: { alert: 'push-unregister-stuck' },
      extra: { count: stuck.n, oldest_age_seconds: oldestAge },
    })
  }
}

let infuraCapDay = -1 // the UTC day of the last Infura-cap event from this isolate

/**
 * The first Infura daily-cap answer (HTTP 402, or `code` 402 / `event` -33000 inside a 200) per isolate per UTC day (API-5). A quota error already
 * falls back to Alchemy (API-1), so users see nothing: this is the only signal that the free credits are spent. Another isolate sends its own event
 * the same day; Sentry joins them by the fixed fingerprint into one issue. Never the key, the URL or the body.
 */
export function infuraDailyCap(): void {
  const day = Math.floor(Date.now() / 86_400_000)
  if (day === infuraCapDay) return
  infuraCapDay = day
  logEvent('error', 'alert_infura_daily_cap')
  // The date is in the message: the SDK's Dedupe integration drops an event equal to the one before it, so the next day's event would be lost. The fingerprint still keeps one issue.
  Sentry.captureMessage(`Infura daily cap reached ${new Date().toISOString().slice(0, 10)}`, {
    level: 'error',
    fingerprint: ['alert', 'infura-402'],
    tags: { alert: 'infura-402' },
  })
}
