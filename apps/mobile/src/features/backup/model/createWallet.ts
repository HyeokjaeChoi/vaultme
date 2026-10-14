import { deriveAddress, generateMnemonic } from '@vaultme/wallet-core'
import { hasPhrase, savePhrase, setAccountAddress, setBackupDone, type AuthPrompt } from '@/shared/storage'

/**
 * S02 -> Home: generate 12 words, store them behind OS auth, and keep the first-account public address in kv
 * (derived here while the Mnemonic is in memory, so Receive never needs the phrase). No phrase is shown here (the backup is S03).
 * Never replaces an existing phrase; if a phrase exists without an address (old install) nothing can be derived without auth, so Receive stays closed.
 */
export async function createWallet(prompt: AuthPrompt): Promise<void> {
  if (await hasPhrase()) return
  const m = generateMnemonic()
  await savePhrase(m, prompt)
  setAccountAddress(deriveAddress(m))
  setBackupDone(false)
}
