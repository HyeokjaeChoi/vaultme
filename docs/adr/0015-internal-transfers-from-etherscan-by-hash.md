# 0015. Internal transfers come from Etherscan by transaction hash

Status: Accepted (2026-10-26, issue #236, owner grilling). Extends [0007](0007-chain-data-only-through-api-proxy.md); does not supersede it.

## Context
A contract can move ETH while a transaction runs (for example an EIP-7702 sweep). The transaction's own `value` can be 0 and the transaction page showed 0 ETH. The page needs the internal transfers of one transaction, the same for every viewer. ADR-0007 already sends history through Etherscan V2 (`txlistinternal` by address).

## Decision
- `POST /v1/tx/internal` with body `{ hash }` returns `{ items: [{ from, to, value, ok }] }`.
- Source: Etherscan V2 `module=account&action=txlistinternal&txhash=…&chainid=11155111`, through `apps/api/src/etherscan.ts` (same global call rate, metrics and error mapping as history).
- Same auth and rate limits as `/v1/history`. No Worker cache.
- Not used: a trace RPC (`debug_traceTransaction`, `trace_transaction`). Infura and Alchemy differ in method names, network support and plan rules, so a fallback would have to match both. Infura Sepolia trace support is not verified (its docs page returned 404).

## Consequences
- No fallback provider. If Etherscan fails, the API answers 503 `unavailable` and the client shows an error with retry.
- Etherscan can lag a fresh block. An empty list means "none" or "not indexed yet"; the client hides the section.
- Etherscan returns only non-zero value internal transfers (Etherscan V2 docs, "Get Internal Transactions by Transaction Hash"; not checked against live data in this ADR).
- A row that cannot be read fails the whole answer with 503 (fail closed). A changed Etherscan format would then fail every retry for that transaction.
- Considered and accepted: every call takes a token of the global Etherscan bucket and nothing is cached, so a fresh block shows as soon as Etherscan has it.

<!-- verified: apps/api/src/etherscan.ts, apps/api/src/tx-internal.ts, apps/api/src/app.ts, packages/contracts/src/tx.ts -->
