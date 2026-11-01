import type { CloudflareOptions } from '@sentry/cloudflare'
import { scrubBreadcrumb, scrubEvent } from '@vaultme/contracts'
import type { Env } from './env.ts'

/**
 * Sentry options for the Worker (Q50). Errors only: no tracing, no profiling, no default PII.
 * `beforeSend` removes the user, request body, query, cookies and headers and scrubs every string (address, tx hash, key, push token, phrase).
 * Outgoing fetch breadcrumbs are dropped: the Infura, Alchemy and Etherscan URLs carry the API keys.
 */
export const sentryOptions = (env: Env['Bindings']): CloudflareOptions => ({
  dsn: env.SENTRY_DSN === '' ? undefined : env.SENTRY_DSN, // empty or unset: the SDK sends nothing (tests)
  environment: env.ENVIRONMENT,
  // @sentry/cloudflare 11 replaced `sendDefaultPii` with `dataCollection` (the option is gone from its types): everything off, so the
  // SDK collects no user, cookies, headers, bodies or query (beforeSend below is the second guard).
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    databaseQueryData: false,
    queues: false,
    stackFrameVariables: false,
  },
  beforeSend: (event) => scrubEvent(event),
  beforeBreadcrumb: (crumb) =>
    ['fetch', 'xhr', 'http'].includes(crumb.category ?? '') ? null : scrubBreadcrumb(crumb),
})
