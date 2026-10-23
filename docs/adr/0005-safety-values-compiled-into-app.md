# 0005. Safety-critical values are compiled into the app

Status: Accepted (2026-10-13 derived from the removed requirements-session doc, see git history)
Supersedes/Aliases: Q73

## Context
The API proxy sits between the app and the chain. A wrong server could send a wrong chain ID, token address, or transaction hash.

## Decision
The chain ID (Sepolia), the USDC address and decimals, the derivation path, the burn-address list, and an absolute fee cap are constants in `wallet-core`. The app never fetches them. The app builds and signs the transaction on the device. It computes the transaction hash from the signed raw transaction and compares it with the server answer. A different hash gives the state `Unknown`. A fee cap above the absolute cap blocks the send.

## Consequences
- A new chain or token needs a new app release.
- The server can still lie about balances, history, and receipts. The app shows the data source and update time and accepts this risk.
- The proxy allow-list repeats the USDC address on the server side. The two must change together.

<!-- verified: packages/wallet-core/src/constants.ts, packages/wallet-core/src/send.ts, apps/mobile/src/shared/chain/real.ts, apps/api/src/rpc.ts -->
