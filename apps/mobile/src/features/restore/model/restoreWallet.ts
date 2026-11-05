import { deriveAddress, toMnemonic } from '@vaultme/wallet-core/signer'
import { appStore } from '@/shared/app-store'
import { classifySaveFailure } from '@/shared/auth'
import { QUERY_CACHE_KEY, queryClient } from '@/shared/query'
import {
  clearAccountAddress,
  deletePhrase,
  hasPhrase,
  savePhrase,
  setAccountAddress,
  queryStorage,
  type AuthPrompt,
} from '@/shared/storage'
import { inspectPhrase, type PhraseIssue } from './phrase'

export type RestoreResult =
  | { status: 'ok'; address: string }
  | { status: 'invalid'; issue: PhraseIssue }
  | { status: 'exists' } // a phrase is already stored on this install: never overwritten (one wallet per install)
  | { status: 'cancelled' } // the user dismissed the OS auth sheet: no message
  | { status: 'noLock' } // the OS refused to store it and the device has no screen lock
  | { status: 'error' } // the OS refused to store it for another reason

/**
 * S05 -> S06. Validates the typed phrase, refuses to overwrite a stored one, stores it behind OS auth and keeps the
 * first-account public address in kv (derived here, ADR-0002 path m/44'/60'/0'/0/0). Backup stays not done (a restore
 * is no proof of a safe backup); `restored` marks the wallet so Home and Receive can skip the new-wallet backup gate.
 * `passphrase` (optional BIP39 25th word, '' = none) is stored in the same keychain item and never shown again; the caller
 * must clear its own copy wherever it clears `text`. Nothing here logs or rethrows: errors carry no phrase and the UI only needs the status.
 */
export async function restoreWallet(text: string, prompt: AuthPrompt, passphrase = ''): Promise<RestoreResult> {
  const state = inspectPhrase(text, true)
  if (state.issue) return { status: 'invalid', issue: state.issue }
  const m = toMnemonic(text, passphrase)
  if (!m) return { status: 'invalid', issue: { kind: 'badChecksum' } }
  try {
    if (await hasPhrase()) return { status: 'exists' }
    await savePhrase(m, prompt)
    const address = deriveAddress(m)
    setAccountAddress(address)
    appStore().getState().setBackupDone(false)
    appStore().getState().setDepositPromptShown(false)
    appStore().getState().setRestored(true)
    return { status: 'ok', address }
  } catch (e) {
    return { status: await classifySaveFailure(e) }
  }
}

/**
 * S06 "다른 주소예요": the restored wallet is the wrong one, so remove it (phrase from the keychain, address, restored and backup flags)
 * and let the user try again from S05. Only safe right after a restore: nothing else exists yet (no history, no pending tx).
 * Returns false when the keychain still holds the phrase: the caller must stay on S06.
 */
export async function removeRestoredWallet(): Promise<boolean> {
  try {
    await deletePhrase()
  } catch {
    return false
  }
  clearAccountAddress()
  queryClient.clear() // the removed wallet's balances leave memory; the persister would write the empty cache after its 1 s throttle
  try {
    queryStorage.removeItem(QUERY_CACHE_KEY) // ...so remove the stored copy now, in case the app stops before that
  } catch {
    // best effort: the wallet removal below must finish (the stored cache is public balances, keyed by the old address, and the persister overwrites it)
  }
  appStore().getState().setRestored(false)
  appStore().getState().setBackupDone(false)
  appStore().getState().setDepositPromptShown(false)
  return true
}
