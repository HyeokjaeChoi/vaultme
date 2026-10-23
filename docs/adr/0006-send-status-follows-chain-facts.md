# 0006. Send status follows chain facts, and Confirmed means `safe`

Status: Accepted (2026-10-13 derived from the removed requirements-session doc, see git history)
Supersedes/Aliases: Q22, Q37, Q47, Q77

## Context
A receipt does not make a transaction final. On Sepolia the `safe` block lags the newest block by about 7 to 13 minutes. A send can also fail to run because another transaction used the same nonce.

## Decision
A receipt above the `safe` block is `Included`. A receipt at or below it is `Confirmed` or `Failed`. With no receipt, a `safe` account nonce above ours gives `Replaced`. Time alone never changes a state, and the app never resends. `Pending` and `Unknown` sends block a new send. A damaged local record also blocks.

## Consequences
- Users wait several minutes to see Confirmed.
- `Replaced` and `Included` release the send block. The nonce is used by then.
- The state logic is a pure function and is tested without a network.
- The server push does not wait for `safe` (see ADR 0010).

<!-- verified: packages/wallet-core/src/state.ts, apps/mobile/src/features/send/model/txState.ts, apps/mobile/src/features/send/model/runSend.ts, apps/mobile/src/features/send/model/usePendingTx.ts, apps/mobile/src/shared/chain/real.ts -->
