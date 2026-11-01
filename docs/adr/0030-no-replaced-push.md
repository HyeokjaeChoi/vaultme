# 0030. No push for a replaced own transaction

Status: Accepted (2026-11-02 from issue #331, owner decision of 2026-11-02)
Supersedes/Aliases: Q77 in part (the push part; the in-app Replaced state still holds), ADR-0006 in part (Replaced has no push)

## Context
Q77 says the Replaced state unblocks send and that a push notifies it. ADR-0006 built the state. The push was never built (#314, #331). The server sees only Alchemy address-activity webhooks. It never learns of a pending send or its nonce, so a replaced tx that never mines is invisible to it.

## Decision
- The in-app Replaced state (ADR-0006) stays. It still unblocks a new send.
- There is no `replaced` push. `PushKind` has no `replaced`.
- A `replaced` push would need the app to register each send (hash, nonce) with the API, plus a poll per pending send. That is a new endpoint, a D1 table and cron work.
- The server would then hold a record that links an install to its sends. ADR-0022 links an install to an address only while push is on; this record would add a privacy cost.
- VaultMe has no speed-up or cancel today. A replacement happens only when the same recovery phrase sends from another wallet with the same nonce. This is rare.

## Consequences
- A user who replaces a tx gets no push. The app shows Replaced when it is open.
- No new endpoint, table or cron job, and no new server record of sends.
- Revisit when speed-up or cancel is built (the owner asked for research on it on 2026-11-02). Decide on the `replaced` push together with it.

<!-- verified: packages/contracts/src/push.ts, packages/wallet-core/src/state.ts -->
