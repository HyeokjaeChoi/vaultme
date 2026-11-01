import * as Sentry from '@sentry/cloudflare'
import { nowSeconds } from './auth.ts'
import type { Env } from './env.ts'
import { logEvent } from './log.ts'

type Bindings = Env['Bindings']

/** 5xx answers in the last hour that make the cron report a spike (Q69). Absolute: the Worker keeps no request total to make a ratio from. */
const SERVER_ERROR_ALERT_COUNT = 10
const WINDOW_SECONDS = 3600
const KEEP_SECONDS = 24 * 3600

/** Counts one 5xx answer. Only the time is stored. A failed write (D1 down is a likely cause of 5xx) is logged, never thrown. */
export async function recordServerError(env: Bindings): Promise<void> {
  try {
    await env.DB.prepare('INSERT INTO server_errors (at) VALUES (?)').bind(nowSeconds()).run()
  } catch {
    logEvent('error', 'server_error_not_counted')
  }
}

/**
 * Hourly cron (Q69). Sends one Sentry event per condition that holds, with a fixed fingerprint so Sentry keeps one issue and its alert rule
 * (email to the owner) fires on it. Only the 5xx spike is checked: the other two conditions of Q56 (watcher stall, dead-letter) have no
 * source here (push comes from the Alchemy webhook, there is no watcher cursor and no queue), see docs/decisions.md Q69.
 */
export async function checkAlerts(env: Bindings): Promise<void> {
  const now = nowSeconds()
  await env.DB.prepare('DELETE FROM server_errors WHERE at < ?')
    .bind(now - KEEP_SECONDS)
    .run()
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM server_errors WHERE at >= ?')
    .bind(now - WINDOW_SECONDS)
    .first<{ n: number }>()
  const count = row?.n ?? 0
  if (count < SERVER_ERROR_ALERT_COUNT) return
  logEvent('error', 'alert_5xx_spike', { count })
  Sentry.captureMessage('API 5xx spike', {
    level: 'error',
    fingerprint: ['alert', 'api-5xx-spike'],
    tags: { alert: 'api-5xx-spike' },
    extra: { count_last_hour: count },
  })
}
