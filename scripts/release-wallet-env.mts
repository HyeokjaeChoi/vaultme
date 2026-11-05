// Prints KEY=value lines (public addresses and the public passphrase B only, never the phrase) for the funded Maestro flows (#381).
// Usage: tsx scripts/release-wallet-env.mts a|b   (the wallet that SENDS on this platform; the other one receives)
// Env: E2E_RELEASE_PHRASE. Read by apps/mobile/.maestro/release-run.sh.
import { releaseWallets } from './release-wallets.mts'

const sender = process.argv[2]
const wallets = releaseWallets(process.env.E2E_RELEASE_PHRASE?.trim() ?? '')
if (!wallets || (sender !== 'a' && sender !== 'b')) {
  console.error('::error::E2E_RELEASE_PHRASE is missing or invalid, or the sender is not a|b.')
  process.exit(1)
}
const [from, to] = sender === 'a' ? [wallets.a, wallets.b] : [wallets.b, wallets.a]
console.log(`MAESTRO_SENDER_PASSPHRASE=${from.passphrase}`)
console.log(`MAESTRO_SENDER_PREFIX=${from.address.slice(0, 6)}`)
console.log(`MAESTRO_RECEIVER_PASSPHRASE=${to.passphrase}`)
console.log(`MAESTRO_RECEIVER_PREFIX=${to.address.slice(0, 6)}`)
console.log(`MAESTRO_RECIPIENT=${to.address}`)
