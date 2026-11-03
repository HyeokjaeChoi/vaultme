// Owner setup for the release gate (#392, ADR-0032): run once with `pnpm exec tsx scripts/release-wallet-setup.mts`.
// Makes a new recovery phrase, writes it to the GitHub Environment `release` secret E2E_RELEASE_PHRASE through the stdin of
// `gh secret set` (never printed, never written to a file), and prints only the account 1 address to fund on Sepolia.
// Refuses when the secret already exists: replacing it would orphan the funded wallet. Needs `gh` signed in as a repo admin.
import { execFileSync } from 'node:child_process'
import { deriveAddress, generateMnemonic } from '../packages/wallet-core/src/mnemonic.ts'

const repo = process.env.GITHUB_REPOSITORY ?? 'HyeokjaeChoi/vaultme'
const gh = (args: string[], input?: string) =>
  execFileSync('gh', [...args, '--repo', repo], { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'] })

if (
  gh(['secret', 'list', '--env', 'release', '--json', 'name', '--jq', '.[].name'])
    .split('\n')
    .includes('E2E_RELEASE_PHRASE')
) {
  console.error('E2E_RELEASE_PHRASE already exists in Environment `release`. Nothing changed.')
  process.exit(1)
}
const mnemonic = generateMnemonic()
gh(['secret', 'set', 'E2E_RELEASE_PHRASE', '--env', 'release'], mnemonic.reveal())
console.log(
  `E2E_RELEASE_PHRASE is set. Fund account 1 on Sepolia (about 0.1 ETH and 10 USDC): ${deriveAddress(mnemonic)}`,
)
