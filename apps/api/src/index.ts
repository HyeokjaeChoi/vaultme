import * as Sentry from '@sentry/cloudflare'
import { app } from './app.ts'
import { checkAlerts } from './alerts.ts'
import type { Env } from './env.ts'
import { logEvent, withRequestId } from './log.ts'
import { sweep } from './push.ts'
import { sentryOptions } from './sentry.ts'

/** The Worker handlers without the Sentry wrapper, so tests can wrap them with a capturing client. `withSentry` patches the object it gets and marks its functions, so the default export wraps a copy and a test wraps new functions. */
export const handler = {
  fetch: app.fetch,
  // Hourly: expire inactive push subscriptions, purge installs idle 90 days (Q31) and retry failed Alchemy address removals (#67),
  // then report alert conditions to Sentry (Q69). The check runs even when the sweep throws, and the sweep error is still thrown.
  scheduled: (_event: ScheduledController, env: Env['Bindings']) =>
    withRequestId(crypto.randomUUID(), async () => {
      const t0 = Date.now()
      let sweepFailed = false
      let sweepError: unknown
      try {
        await sweep(env)
      } catch (e) {
        sweepFailed = true
        sweepError = e
      }
      try {
        await checkAlerts(env)
      } catch (e) {
        // Reported on its own; it must not replace the sweep error below.
        logEvent('error', 'alert_check_failed', { name: e instanceof Error ? e.name : 'error' })
        Sentry.captureException(e)
      }
      logEvent('info', 'cron', { duration_ms: Date.now() - t0, sweep_ok: !sweepFailed })
      if (sweepFailed) throw sweepError // the Sentry wrapper reports it
    }),
} satisfies ExportedHandler<Env['Bindings']>

export default Sentry.withSentry(sentryOptions, { ...handler })
export { EtherscanBucket } from './bucket.ts'
