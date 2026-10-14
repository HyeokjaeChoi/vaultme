import * as Crypto from 'expo-crypto'
import * as Keychain from 'react-native-keychain'
import { Mnemonic } from '@vaultme/wallet-core'

// Keychain access for the app (lld.md §3: wallet-core does not know storage).
// Two items, two tiers (hld.md §5, Q34, Q63):
const PHRASE_SERVICE = 'app.vaultme.phrase'
const KV_KEY_SERVICE = 'app.vaultme.kvkey'
const USER = 'vaultme'

// Phrase (Q34): "BIOMETRY_ANY_OR_DEVICE_PASSCODE, this device only, no cloud backup".
// OS enforces auth; survives biometric changes; device passcode is the fallback.
// WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: needs a device passcode, never migrates, never in backups.
const PHRASE_OPTIONS = {
  service: PHRASE_SERVICE,
  accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
  accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
  cloudSync: false,
} as const

// MMKV encryption key (Q63): "keychain tier without authentication" so the lock gate can read
// MMKV before the first render. This device only. It is not the phrase.
const KV_KEY_OPTIONS = {
  service: KV_KEY_SERVICE,
  accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  cloudSync: false,
} as const

/** OS auth sheet text, shown by BiometricPrompt on Android (the OS default is English). */
export type AuthPrompt = { title: string; cancel: string }

export async function savePhrase(m: Mnemonic, prompt: AuthPrompt): Promise<void> {
  const ok = await Keychain.setGenericPassword(USER, m.reveal(), { ...PHRASE_OPTIONS, authenticationPrompt: prompt })
  if (!ok) throw new Error('keychain: save failed')
}

export type LoadPhraseResult = { status: 'ok'; mnemonic: Mnemonic } | { status: 'cancelled' } | { status: 'error' }

/** Cancel vs failure from a keychain rejection. iOS: "User canceled the operation." (errSecUserCanceled); Android surfaces a cancel in its message too. Anything else is an error. */
export const loadFailureStatus = (e: unknown): 'cancelled' | 'error' =>
  e instanceof Error && /cancel/i.test(e.message) ? 'cancelled' : 'error'

/** Asks the OS for auth. Never throws: the UI gets `ok`, `cancelled` (user dismissed auth) or `error` (missing/corrupt item, keychain failure). */
export async function loadPhrase(prompt: AuthPrompt): Promise<LoadPhraseResult> {
  try {
    const item = await Keychain.getGenericPassword({
      service: PHRASE_SERVICE,
      accessControl: PHRASE_OPTIONS.accessControl,
      authenticationPrompt: prompt,
    })
    if (!item) return { status: 'error' }
    return { status: 'ok', mnemonic: new Mnemonic(item.password) }
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
