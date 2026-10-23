# 0002. The wallet is a seed-phrase EOA with one derivation path

Status: Accepted (2026-10-13 derived from the removed requirements-session doc, see git history)
Supersedes/Aliases: Q8, Q9, Q40 (path part), "latest decision" (EOA first)

## Context
A Passkey Smart Account for new wallets was studied and recommended for validation. It needs a recovery model, a contract, and a second account type. The owner chose a smaller first version.

## Decision
Every wallet is a BIP39 seed phrase that controls one EOA at `m/44'/60'/0'/0/0`. A new wallet has 12 words. A restore accepts 12 or 24 words. The user keeps the phrase on paper. There is no cloud backup, no Smart Account, no ERC-4337, no EIP-7702, and no Passkey signer.

## Consequences
- Losing the phrase means losing the funds. No server can recover them.
- A restored wallet shows only the first account. Funds on other paths or accounts are not found.
- Signing and key code stay in `wallet-core`. A later account type adds code there. It must not change screens.

<!-- verified: packages/wallet-core/src/constants.ts, packages/wallet-core/src/mnemonic.ts, apps/mobile/src/features/backup/model/createWallet.ts, apps/mobile/src/features/restore/model/restoreWallet.ts -->
