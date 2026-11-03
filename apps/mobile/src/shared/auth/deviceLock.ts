import * as LocalAuthentication from 'expo-local-authentication'
import { loadFailureStatus } from './cancel'

/**
 * Does the device have a screen lock (PIN, pattern, passcode or biometrics)? The phrase is stored with
 * `WHEN_PASSCODE_SET_THIS_DEVICE_ONLY` (ADR-0004), so without one no wallet can be created or restored.
 * A failed check says `true`: it must not block the user, the keychain stays the real gate (see `classifySaveFailure`).
 * So does a check with no answer within 3 s: on the CI simulator the OS call sometimes did not settle, and the restore grid stayed hidden (#386).
 */
export async function deviceLockSet(): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      LocalAuthentication.getEnrolledLevelAsync().then((level) => level !== LocalAuthentication.SecurityLevel.NONE),
      new Promise<boolean>((resolve) => (timer = setTimeout(() => resolve(true), 3000))),
    ])
  } catch {
    return true
  } finally {
    clearTimeout(timer)
  }
}

/** Why the keychain refused to store the phrase: the user dismissed the OS sheet (no message), no screen lock, or anything else. */
export type SaveFailure = 'cancelled' | 'noLock' | 'error'

export async function classifySaveFailure(e: unknown): Promise<SaveFailure> {
  if (loadFailureStatus(e) === 'cancelled') return 'cancelled'
  return (await deviceLockSet()) ? 'error' : 'noLock'
}
