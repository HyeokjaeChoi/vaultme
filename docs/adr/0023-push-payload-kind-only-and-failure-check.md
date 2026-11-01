# 0023. Push payload is `kind` only; the webhook checks own sends on the chain; Expo receipts are polled

Status: Accepted (2026-11-01 from issue #314, owner decisions of 2026-11-01)
Supersedes/Aliases: Q29 in part (no opaque id; a tap opens the list), owner decision of #171 (a tap opens S41), ADR-0010 in part (zero-value skip, no chain read)

## Context
ADR-0010 sends one push per deposit or send reported by the Alchemy webhook. The payload carried the tx hash and a tap opened S41. Owner decisions Q23/Q24 ask for a push when an own tx fails, Q39 for Expo receipt checks, Q29 for a payload without the hash.

## Decision
- Payload `data` = `{kind}`, kind `deposit | send | failed`. The text has no amount and no address. A tap opens `/activity` (the 내역 list). No per-tx link, no opaque id.
- `failed`: for an own outgoing tx the webhook reports, the Worker reads `eth_getTransactionReceipt` through the RPC proxy before the claim. Status `0x0` = `failed`. An own zero-value external ETH tx (a reverted token call has no transfer leg) is checked too and pushed only when it failed. If the chain cannot be read, or has no receipt yet, the webhook answers 5xx and Alchemy retries.
- Receipts: ids of `ok` Expo tickets go to D1 (`push_receipts`). The hourly cron reads them after 15 minutes. `DeviceNotRegistered` deletes the subscription while it still has the pushed token. Ids are purged after 7 days at the latest.
- There is no `replaced` push (Q77, ADR-0030): the server keeps no record of pending sends.

## Consequences
- Older app builds parse `hash` as required and `kind` as `deposit | send`: they open nothing on a tap until updated. Accepted by the owner (testnet): ship the app and the API together.
- Detection of `failed` covers only txs Alchemy reports. Whether Alchemy reports every reverted tx is not verified.
- The webhook now depends on the RPC upstreams for own sends.

<!-- verified: apps/api/src/push.ts, apps/api/migrations/0003_push_receipts.sql, packages/contracts/src/push.ts, apps/mobile/src/features/push/model/push.ts -->
