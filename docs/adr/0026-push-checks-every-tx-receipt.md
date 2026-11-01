# 0026. The push webhook reads the receipt of every notified tx, deposits too

Status: Accepted (2026-11-01 from issue #346, owner decision of 2026-11-01)
Supersedes/Aliases: ADR-0023 in part (the receipt read covers own sends only), ADR-0010 in part (a log Alchemy marks removed is the only reorg guard)

## Context
ADR-0023 reads `eth_getTransactionReceipt` for own sends before the claim. An incoming ETH leg (`external` or `internal`) has no `log`, so Alchemy's `removed` flag cannot mark it. The anvil reorg tests (#345, `apps/api/test-reorg`) showed that a deposit reorged out before the webhook runs is still pushed. A sent push cannot be recalled (ADR-0010).

## Decision
- Before the claim, the Worker reads the receipt of every notified tx, deposits included. No receipt, RPC error or unknown status: no push and no claim for that tx. The other pushes of the payload go first, then the webhook answers 5xx and Alchemy retries (same as for `failed`).
- Receipt status `0x0` still turns an own send into `failed` (ADR-0023). A deposit from another sender keeps its kind; a self-send whose received leg won is own and still becomes `failed`.
- `failed` has its own `push_sent` ref, `<hash>:failed` (#345), so a `send` push that went out before a reorg does not block the `failed` push of the re-mined tx.
- No retraction push is added.

## Consequences
- One extra RPC call per deposit (one per hash, through the RPC proxy with its Infura then Alchemy fallback).
- A deposit waits for the receipt: a lagging node delays it through the 5xx retry.
- A reorg after the receipt was read still cannot be seen. Only finality (`safe`) would close that, and the push does not wait for it (ADR-0006, ADR-0010).

<!-- verified: apps/api/src/push.ts, apps/api/test-reorg/reorg.test.ts, apps/api/test/push.test.ts -->
