import * as LocalAuthentication from 'expo-local-authentication'
import { withAuthInProgress } from './inProgress'

export type AuthResult = 'ok' | 'cancelled' | 'error' | 'unavailable'

const CANCEL = ['user_cancel', 'system_cancel', 'app_cancel', 'user_fallback']
const UNAVAILABLE = ['not_enrolled', 'not_available', 'passcode_not_set']

/** Maps an expo-local-authentication result to the app's four outcomes. Lockout, timeout and failures are `error`. */
export function mapAuthResult(r: { success: true } | { success: false; error: string }): AuthResult {
  if (r.success) return 'ok'
  if (CANCEL.includes(r.error)) return 'cancelled'
  if (UNAVAILABLE.includes(r.error)) return 'unavailable'
  return 'error'
}

/**
 * OS auth (Q12, Q13, Q34): biometrics, with the device passcode as fallback (`disableDeviceFallback: false`).
 * `reason` is the Korean text on the OS sheet. Never throws. Used by the lock gate (S90); send (#23) reuses it per send (Q12).
 */
export async function authenticate(reason: string): Promise<AuthResult> {
  try {
    // SecurityLevel.NONE: no passcode and no biometrics, so no OS auth can exist.
    if ((await LocalAuthentication.getEnrolledLevelAsync()) === LocalAuthentication.SecurityLevel.NONE)
      return 'unavailable'
    const r = await withAuthInProgress(() =>
      LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: '취소',
        disableDeviceFallback: false,
      }),
    )
    return mapAuthResult(r)
  } catch {
    return 'error'
  }
}
