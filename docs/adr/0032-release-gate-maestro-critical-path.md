# 0032. A release is a `v*` tag, gated by the Maestro critical path

Status: Accepted (2026-11-03 from issue #378, owner decisions of 2026-11-03)
Supersedes/Aliases: ADR-0025 in part (the release tag and the E2E release gate no longer wait for production), Q54 in part (the release hard gate), Q55 in part (release tag)

## Context
ADR-0025 put the release tag and the E2E hard gate off until production exists. The owner wants one fixed set of end-to-end flows, the critical path, to decide every release now, before production. Today the Maestro smoke runs on PRs and the full run runs nightly (`docs/testing/e2e.md`). The send flow stops at the amount screen, because the public test vector has no Sepolia ETH.

## Decision
- A release is a `v*` tag. The tag workflow runs the critical path. Only when it passes does the workflow build the app with EAS (staging API). PRs keep the smoke gate.
- The critical path runs on the iOS simulator and the Android emulator:
  - create wallet + backup
  - restore
  - lock gate, device auth, Home
  - Receive address
  - ETH send: Review, device auth, real Sepolia broadcast, Confirmed, Activity row
  - USDC send: the same steps
  - a received transaction: account 1 sends to account 2 of the same phrase, and account 2's Activity shows it
- The real sends use a dedicated funded test wallet. Its phrase is the secret `E2E_RELEASE_PHRASE` in the GitHub Environment `release`, which only `v*` tag runs can read. The phrase never reaches a log or an artifact. A balance check runs first and fails with a clear message when ETH or USDC is short.
- Failure rule: each failed flow runs once more. A pass on the retry lets the release continue and opens a flaky-test issue. A second failure stops the build.
- Speed up and cancel are not on the critical path: Sepolia includes a transaction in about 12 s, so a Pending replacement is rarely observable.

## Consequences
- A release spends a little Sepolia ETH (gas) and moves test USDC between two accounts of the same wallet. The owner keeps the wallet funded.
- Production stays as ADR-0025 says: manual approval, gradual Workers deploy and the EAS production channel still wait for the first public release.
- Without an Apple Developer account, the iOS release build is a simulator build; Android is an internal APK. TestFlight comes with the account.
- Owner setup: the funded wallet, Environment `release` with `E2E_RELEASE_PHRASE` and `EXPO_TOKEN`, `e2e` as a required check of `protect-main`, and a tag ruleset so only the owner creates `v*` tags.
- Work: #379 (this record), #380 (release workflow, iOS), #381 (funded flows), #382 (Android).
