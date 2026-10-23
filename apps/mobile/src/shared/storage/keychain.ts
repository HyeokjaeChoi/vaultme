import * as Crypto from 'expo-crypto'
import * as Keychain from 'react-native-keychain'
import { Mnemonic } from '@vaultme/wallet-core'
import { withAuthInProgress } from '../auth/inProgress'

// Keychain access for the app (ARCHITECTURE.md#invariants: wallet-core does not know storage).
// Two items, two tiers (ARCHITECTURE.md#invariants, ADR-0004):
const PHRASE_SERVICE = 'app.vaultme.phrase'
const KV_KEY_SERVICE = 'app.vaultme.kvkey'
const DEVICE_KEY_SERVICE = 'app.vaultme.devicekey'
const USER = 'vaultme'

// Phrase (ADR-0004): "BIOMETRY_ANY_OR_DEVICE_PASSCODE, this device only, no cloud backup".
// OS enforces auth; survives biometric changes; device passcode is the fallback.
// WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: needs a device passcode, never migrates, never in backups.
const PHRASE_OPTIONS = {
  service: PHRASE_SERVICE,
  accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
  accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
  cloudSync: false,
} as const

// MMKV encryption key (ADR-0004): "keychain tier without authentication" so the lock gate can read
// MMKV before the first render. This device only. It is not the phrase.
const KV_KEY_OPTIONS = {
  service: KV_KEY_SERVICE,
  accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  cloudSync: false,
} as const

/** OS auth sheet text, shown by BiometricPrompt on Android (the OS default is English). */
export type AuthPrompt = { title: string; cancel: string }

// One item, same tier for words and BIP39 passphrase. No passphrase: the words alone (the original format).
// With passphrase: words + "\n" + passphrase (words never contain a newline; the passphrase may, so split at the first one).
export const encodePhrase = (m: Mnemonic): string => (m.passphrase() ? `${m.reveal()}\n${m.passphrase()}` : m.reveal())
export function decodePhrase(stored: string): Mnemonic {
  const i = stored.indexOf('\n')
  return i < 0 ? new Mnemonic(stored) : new Mnemonic(stored.slice(0, i), stored.slice(i + 1))
}

export async function savePhrase(m: Mnemonic, prompt: AuthPrompt): Promise<void> {
  const ok = await withAuthInProgress(() =>
    Keychain.setGenericPassword(USER, encodePhrase(m), { ...PHRASE_OPTIONS, authenticationPrompt: prompt }),
  )
  if (!ok) throw new Error('keychain: save failed')
}

export type LoadPhraseResult = { status: 'ok'; mnemonic: Mnemonic } | { status: 'cancelled' } | { status: 'error' }

/** Cancel vs failure from a keychain rejection. iOS: "User canceled the operation." (errSecUserCanceled); Android surfaces a cancel in its message too. Anything else is an error. */
export const loadFailureStatus = (e: unknown): 'cancelled' | 'error' =>
  e instanceof Error && /cancel/i.test(e.message) ? 'cancelled' : 'error'

/** Asks the OS for auth. Never throws: the UI gets `ok`, `cancelled` (user dismissed auth) or `error` (missing/corrupt item, keychain failure). */
export async function loadPhrase(prompt: AuthPrompt): Promise<LoadPhraseResult> {
  try {
    const item = await withAuthInProgress(() =>
      Keychain.getGenericPassword({
        service: PHRASE_SERVICE,
        accessControl: PHRASE_OPTIONS.accessControl,
        authenticationPrompt: prompt,
      }),
    )
    if (!item) return { status: 'error' }
    return { status: 'ok', mnemonic: decodePhrase(item.password) }
  } catch (e) {
    // Do not log or rethrow the error: it must never carry or hint at the phrase. Only its cancel-ness is read.
    return { status: loadFailureStatus(e) }
  }
}

/** Existence check. Does not ask for auth. */
export const hasPhrase = (): Promise<boolean> => Keychain.hasGenericPassword({ service: PHRASE_SERVICE })

export async function deletePhrase(): Promise<void> {
  const ok = await Keychain.resetGenericPassword({ service: PHRASE_SERVICE })
  // false can also mean "nothing to delete"; only fail if the item is still there.
  if (!ok && (await hasPhrase())) throw new Error('keychain: delete failed')
}

export const biometryType = () => Keychain.getSupportedBiometryType()

/** 16 random bytes as 32 hex chars: a 32-char AES-256 key string for MMKV with 128 bits of entropy. Created once, then reused. */
export async function getOrCreateKvKey(): Promise<string> {
  const existing = await Keychain.getGenericPassword({ service: KV_KEY_SERVICE })
  if (existing) return existing.password
  const key = Array.from(Crypto.getRandomBytes(16), (b) => b.toString(16).padStart(2, '0')).join('')
  const ok = await Keychain.setGenericPassword(USER, key, KV_KEY_OPTIONS)
  if (!ok) throw new Error('keychain: kv key save failed')
  return key
}

/**
 * Install auth key (ARCHITECTURE.md#install-auth): ECDSA P-256 private key, hex. Same no-auth tier as the MMKV key, so API calls need no prompt.
 * It signs token requests only. It is not the wallet key and cannot move funds.
 */
export async function loadDeviceKey(): Promise<string | null> {
  const item = await Keychain.getGenericPassword({ service: DEVICE_KEY_SERVICE })
  return item ? item.password : null
}

export async function saveDeviceKey(hex: string): Promise<void> {
  const ok = await Keychain.setGenericPassword(USER, hex, { ...KV_KEY_OPTIONS, service: DEVICE_KEY_SERVICE })
  if (!ok) throw new Error('keychain: device key save failed')
}
