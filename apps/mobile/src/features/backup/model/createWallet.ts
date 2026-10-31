import { deriveAddress, generateMnemonic } from '@vaultme/wallet-core'
import { appStore } from '@/shared/app-store'
import {
  getAccountAddress,
  hasPhrase,
  loadPhrase,
  savePhrase,
  setAccountAddress,
  type AuthPrompt,
} from '@/shared/storage'

/**
 * S02 -> Home: generate 12 words, store them behind OS auth, and keep the first-account public address in kv
 * (derived here while the Mnemonic is in memory, so Receive never needs the phrase). No phrase is shown here (the backup is S03).
 * Never replaces an existing phrase. If one exists without an address (interrupted creation, old install), the address is
 * recovered from it after OS auth; a cancelled or failed auth throws.
 */
export async function createWallet(prompt: AuthPrompt): Promise<void> {
  if (await hasPhrase()) {
    if (getAccountAddress() !== null) return
    const r = await loadPhrase(prompt)
    if (r.status !== 'ok') throw new Error(`createWallet: phrase ${r.status}`)
    setAccountAddress(deriveAddress(r.mnemonic))
    return
  }
  const m = generateMnemonic()
  await savePhrase(m, prompt)
  setAccountAddress(deriveAddress(m))
  appStore().getState().setBackupDone(false)
  appStore().getState().setDepositPromptShown(false)
  appStore().getState().setRestored(false)
}
