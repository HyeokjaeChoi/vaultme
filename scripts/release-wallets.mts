// The two funded E2E wallets of the release gate (#381, ADR-0032): one phrase (E2E_RELEASE_PHRASE), account 1 each.
// A = no BIP39 passphrase, B = the passphrase below. The app keeps one account, so the iOS job sends from A to B and the
// Android job from B to A: each sender is used by one platform only (no nonce clash). The passphrase is useless without the phrase.
import { deriveAddress, toMnemonic } from '../packages/wallet-core/src/mnemonic.ts'

export const PASSPHRASE_B = 'vaultme-e2e-b'

export type ReleaseWallet = { passphrase: string; address: string }

/** Both wallets of a phrase, or null when the phrase is not a valid recovery phrase. Addresses are public. */
export function releaseWallets(phrase: string): { a: ReleaseWallet; b: ReleaseWallet } | null {
  const wallet = (passphrase: string): ReleaseWallet | null => {
    const m = toMnemonic(phrase, passphrase)
    return m && { passphrase, address: deriveAddress(m) }
  }
  const a = wallet('')
  const b = wallet(PASSPHRASE_B)
  return a && b && { a, b }
}
