import { deriveAddress, toMnemonic } from '@vaultme/wallet-core'
import { hasPhrase, savePhrase, setAccountAddress, setBackupDone, setRestored, type AuthPrompt } from '@/shared/storage'
import { inspectPhrase, type PhraseIssue } from './phrase'

export type RestoreResult =
  | { status: 'ok'; address: string }
  | { status: 'invalid'; issue: PhraseIssue }
  | { status: 'exists' } // a phrase is already stored on this install: never overwritten (one wallet per install)
  | { status: 'error' } // the OS refused to store it (auth cancelled, no screen lock)

/**
 * S05 -> S06. Validates the typed phrase, refuses to overwrite a stored one, stores it behind OS auth and keeps the
 * first-account public address in kv (derived here, Q40 path m/44'/60'/0'/0/0). Backup stays not done (Q16: a restore
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
    setBackupDone(false)
    setRestored(true)
    return { status: 'ok', address }
  } catch {
    return { status: 'error' }
  }
}
