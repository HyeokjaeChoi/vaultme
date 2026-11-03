# 0033. Funded release flows use two passphrase wallets; no nightly E2E

Status: Accepted (2026-11-03 from issue #381, owner decisions of 2026-11-03)
Supersedes/Aliases: ADR-0032 in part (the "received transaction" flow and the nightly run)

## Context
ADR-0032 had account 1 send to account 2 of one phrase. The app keeps one account (index 0), so a second account does not exist. A dry run cannot read the `release` Environment, which admits only `v*` tags.

## Decision
- Two wallets from one secret phrase `E2E_RELEASE_PHRASE`: wallet A has no BIP39 passphrase; wallet B has the passphrase `vaultme-e2e-b` (public; useless without the phrase). Both are account 1 of their own seed (`scripts/release-wallets.mts`).
- The iOS job restores A and sends ETH and USDC to B. The Android job restores B and sends to A. Each sender belongs to one platform, so no nonce clash. Then each job restores the receiver from scratch and checks its Activity.
- The first check of the funded flows is the first real `v*` tag run. A failure is fixed, merged and re-tagged. A `dry_run` dispatch runs the five critical flows only (no Environment, no phrase).
- The balance job checks both wallets and prints both addresses.
- No nightly E2E: the `schedule:` trigger of `e2e.yml` is removed. The full run stays as `workflow_dispatch`.
- The phrase never reaches a log or an upload: `::add-mask::` for the phrase and each word, no screenshots or command logs of a tag run uploaded, a word check on the uploaded reports.

## Consequences
- The owner funds wallet B (address shown by the first tag run). Both wallets need ETH for gas and USDC.
- A tag run uploads only the JUnit reports. A failed funded flow has no screenshot.
