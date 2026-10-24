# 0003. Restore accepts an optional BIP39 passphrase; new wallets have none

Status: Accepted (2026-10-17 derived from the removed Redesign B notes, see git history)
Supersedes/Aliases: Q40 (the "no passphrase" part)

## Context
Q40 said the app does not support a BIP39 passphrase. A wrong passphrase on restore gives a different address with no error. Some users have wallets made with a passphrase.

## Decision
The restore screen has an optional passphrase field. It is closed by default and masked. The screen after restore shows the full address so the user can compare it. A new wallet never gets a passphrase. The passphrase is stored in the same Keychain item as the words and is never shown again.

## Consequences
- The stored value has a format: the words, or the words, a newline, and the passphrase. Changing it needs a migration of every installed wallet.
- A wrong passphrase gives a valid but empty wallet. The user must check the address.
- Users cannot add a passphrase to a wallet that the app created.

<!-- verified: apps/mobile/src/shared/storage/keychain.ts, apps/mobile/src/features/restore/model/restoreWallet.ts, apps/mobile/src/features/restore/model/cells.ts, packages/wallet-core/src/mnemonic.ts, packages/i18n/src/ko.ts -->
