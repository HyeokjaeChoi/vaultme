# 0040. Funded release flows wait for Confirmed, never retry, and are checked on chain

Status: Accepted (2026-11-15, issue #497, owner decision 1 of the quality-gates plan, `docs/plans/quality-gates.md`, #482). Supersedes [0032](0032-release-gate-maestro-critical-path.md) in part: the Failure rule, for `funded` flows only. Amends [0033](0033-funded-flows-two-wallets-no-nightly.md) Consequences (evidence).

## Context
- The funded send flows wait 240 s for `보냈어요`. That text shows only for Confirmed: a receipt at or below the `safe` block. ADR-0006: `safe` lags the newest block by 7 to 13 minutes on Sepolia. The wait is too short, so the first `v*` tag run would fail on a send that worked.
- ADR-0032 retries every failed flow once. A retried funded flow signs and broadcasts again: a second real send of the same amount and a nonce used twice.
- A pass is UI text only. Nothing checks that the chain holds what the screen says.

## Decision
- A funded flow waits up to 1,200 s for Confirmed (13 min `safe` lag + the 15 s poll + about 6 min for inclusion and block-time jitter).
- A flow tagged `funded` is never retried (`apps/mobile/.maestro/retry-flows.sh`, called by `run.sh`). A failed funded flow fails the job at once. The fix is merged and the release is tagged again. The retry of the other flows (ADR-0032) stays.
- After the flows, `scripts/release-verify.mts` checks the chain for the sender wallet of that job (iOS: A, Android: B):
  - the sender nonce moved by exactly 2 (ETH, then USDC): more means a send was broadcast again, fewer means a send is missing;
  - each of the 2 txs has receipt status 1, the right recipient and the right amount: ETH by the tx `value`, USDC by the `Transfer` log of the token contract;
  - the fee of each tx is at most `ABS_MAX_FEE_WEI` (0.005 ETH).
  Balance deltas are not used: both jobs send and receive in parallel (ADR-0033). The script reads the sender nonce and the block number before the flows (`snapshot`), then reads the sender's txs from that block on (full blocks, so it needs no archive state, which the public node does not give).
- Evidence: each tag run prints the Etherscan links of the 2 txs of its job (4 txs of the two release wallets per run) and uploads them as the artifacts `release-verify-ios` and `release-verify-android` (90 days). Only the public release wallets' hashes are published, never an app user's. A committed evidence file under `docs/results/` follows with the evidence gate of the plan (EVID-1).
- `release-run.sh` stops at once on a re-run attempt (`GITHUB_RUN_ATTEMPT` above 1): "Re-run jobs" would send the funded sends again and the chain check would pass on the new ones. The workflow has one concurrency group `release`, so two tags never share the two wallets' nonces.
- `funded-2-receive` carries the tag `funded` on purpose and is not retried either: it sends nothing, but one history-indexing flake would otherwise hide a failed send behind a pass, and a failed tag run is re-tagged anyway. The cost: one flake there also needs a re-tag (two new real sends). Split the tag if that proves too costly.
- A second tag pushed while one waits replaces the waiting run (GitHub keeps one running and one pending run per group); dry runs have their own group per ref.
- A balance failure (wallet short of funds) also needs a new tag: a re-run is refused by the guard above.
- The `timeout-minutes` of the iOS and Android release jobs rise from 90 to 150: the old 90 plus 2 x 20 min of waits plus 20 min spare.

## Consequences
- A tag run takes up to 40 minutes longer per platform (2 sends x up to 20 min), in practice about 15 minutes.
- A failed funded flow is re-tagged, never retried in place. A run that failed after a broadcast shows its sends in the `release-verify` step (it runs after a failed flow and after a job timeout too), so a re-tag does not double-send blind.
- The chain check depends on a public Sepolia RPC (`SEPOLIA_RPC_URL`, default publicnode). It fails closed: no answer is a failure, not a pass.
- The first real `v*` tag run is still the first run of the funded flows and of this check. The 1,200 s `extendedWaitUntil` is not run for that long anywhere before it.
