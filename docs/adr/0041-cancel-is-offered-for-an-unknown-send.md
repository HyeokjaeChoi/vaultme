# 0041. Cancel is offered for an Unknown send

Status: Accepted (2026-11-16, issue #596, owner decision 14 of `docs/plans/quality-gates.md`: "Allow, with warning"). Supersedes ADR-0031 in part (D3: speed up and cancel only while Pending).

## Context

- A send ends `Unknown` when its answer was unclear: the submit timed out, or the node's hash did not equal the local hash (`ARCHITECTURE.md`, Transaction state). `Unknown` blocks every new send (`blocksNewSend`) and only a check moves it.
- If the tx never reached a node, no check will ever find a receipt. The record stays `Unknown`, the user cannot send, and S23 and S41 offer no action. The anvil case 9 of CHAIN-3 showed this (`apps/mobile/test-anvil/send-lifecycle.test.ts`, was `it.fails`).
- A cancel is a 0 ETH send to the user's own account with the same nonce (ADR-0031). If the original tx was mined after all, the node refuses the cancel (`nonce too low`) and the original result stands.

## Decision

- `canCancel` is true for `Unknown` as well as `Pending` (and still after a cancel was sent). Speed up stays Pending only.
- The cancel path is the one of ADR-0031: the same sheet, the same OS auth, the same fee plan from the fee fields the record saved. For an Unknown send the sheet adds a warning: "이미 처리됐을 수 있어요" (it may have gone through already). No copy says the send was cancelled before a receipt for the cancel is final.
- When the node takes the cancel of an Unknown send, the record becomes `Pending` with `kind: 'cancel'` (a tx now sits at that nonce). When the answer is unclear, it stays `Unknown`, with the cancel hash and kind recorded so a check finds the receipt. Then the checks decide: `Replaced` (the cancel was mined), or the original's own state if it was mined first.
- UI: S23 and S41 show "거래 취소" for Unknown (no "속도 올리기"). Frames are the Figma session's work (B-S23 and B-S41 Unknown with actions, and the Unknown sheet variant, light and dark). The UI lands in a second PR; this ADR and the model change land first.

## Consequences

- An Unknown send can no longer lock the user out. The cost: one fee-only transaction of about 21,000 gas, paid only if the original did not run.
- A user can cancel a send that was in fact fine. The warning says this can happen; the cancel then fails as `nonce too low` and the checks show the original result.
- Anvil case 9 is a normal test now: Unknown, cancel, mine, `Replaced`, and a new send is allowed.
