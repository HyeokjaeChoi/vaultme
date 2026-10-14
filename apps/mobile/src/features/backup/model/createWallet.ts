import { generateMnemonic } from '@vaultme/wallet-core'
import { hasPhrase, savePhrase, setBackupDone, type AuthPrompt } from '@/shared/storage'

/** S02 -> Home: generate 12 words and store them behind OS auth. No phrase is shown here (the backup is S03). Never replaces an existing phrase. */
export async function createWallet(prompt: AuthPrompt): Promise<void> {
  if (await hasPhrase()) return
  await savePhrase(generateMnemonic(), prompt)
  setBackupDone(false)
}
