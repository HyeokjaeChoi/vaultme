import * as Sentry from '@sentry/react-native'
import { scrubBreadcrumb, scrubEvent } from '@vaultme/contracts'
import Constants from 'expo-constants'
import type { ComponentType } from 'react'

/** Sentry environment (Q50): `staging` or `production` from EXPO_PUBLIC_ENV (eas.json), else `dev` in a dev build and `production` in a release. */
const sentryEnvironment = (publicEnv: string | undefined, dev: boolean): string =>
  publicEnv === 'staging' || publicEnv === 'production' ? publicEnv : dev ? 'dev' : 'production'

/**
 * Crashes and errors only (Q50): no tracing, no replay, no screenshots, `sendDefaultPii` off. The DSN is in app.json `extra.sentryDsn`:
 * a Sentry DSN only allows sending events and is safe to ship in an app (https://docs.sentry.io/concepts/key-terms/dsn-explainer/).
 * No DSN, no Sentry. Every event and breadcrumb goes through the shared scrubber (address, tx hash, key, push token, phrase, URL query).
 */
export function initSentry(): void {
  const dsn: unknown = Constants.expoConfig?.extra?.sentryDsn
  if (typeof dsn !== 'string' || dsn === '') return
  Sentry.init({
    dsn,
    environment: sentryEnvironment(process.env.EXPO_PUBLIC_ENV, __DEV__),
    sendDefaultPii: false,
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb),
  })
}

/** Wraps the root component as the Sentry docs ask (touch and app-start breadcrumbs, error boundary). */
export const wrapRoot = (root: ComponentType): ComponentType => Sentry.wrap(root)

const NATIVE_SEND_MS = 3000

/** The hidden test action exists only in a dev build and in staging (EXPO_PUBLIC_ENV=staging); a release build has no way in. */
const crashDoorOpen = (publicEnv: string | undefined, dev: boolean): boolean => dev || publicEnv === 'staging'

export const testCrashEnabled = (): boolean => crashDoorOpen(process.env.EXPO_PUBLIC_ENV, __DEV__)

/**
 * Proves collection end to end (Q50): one JS error, flushed so it is sent, then a native crash (the crash report goes out at the next launch).
 * Nothing in a release build calls this, and the check here is repeated so a stray call does nothing.
 */
export async function triggerTestCrash(): Promise<void> {
  if (!testCrashEnabled()) return
  Sentry.captureException(new Error('vaultme sentry test (JS)'))
  await Sentry.flush()
  // flush ends when the JS client has handed the event to the native SDK; the native transport sends it a moment later (the first
  // run lost the JS event to an immediate crash). Wait before crashing. Test-only path, so a few seconds cost nothing.
  await new Promise((resolve) => setTimeout(resolve, NATIVE_SEND_MS))
  Sentry.nativeCrash()
}
