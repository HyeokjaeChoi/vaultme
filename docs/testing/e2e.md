# Mobile E2E with Maestro

Owner decision C (2026-11-01, issue #316, Q54): Maestro drives the real Release app on an iOS simulator. No transaction is ever broadcast.

## Flows

Files: `apps/mobile/.maestro/flows/`. Shared steps: `apps/mobile/.maestro/subflows/`.

| Flow | Tag | What it proves |
|---|---|---|
| `create.yaml` | smoke | New wallet (3 checks, OS auth), reveal the phrase, word check, Receive opens |
| `restore.yaml` | smoke | Restore the public test vector (R10); address `0x9858…da94` shows |
| `send.yaml` | smoke | Home, Send, recipient address, amount screen |
| `lock.yaml` | full | Cold start shows the lock gate; OS auth opens Home |
| `receive.yaml` | full | Receive shows the restored address |

Known limit: `send.yaml` stops at the amount screen, not Review. The test vector has 0 ETH on Sepolia, and the amount screen only
opens Review for an amount above 0 that the balance covers. Review needs a funded test wallet (owner decision; its phrase would be a CI secret, never in the repo).

Flows match visible Korean text (button labels are also accessibility labels). A copy change in `packages/i18n` can break a flow: update the flow in the same PR.

## Device auth

The app has no auth bypass (ADR-0016). `run.sh` enrolls Face ID on the simulator, then sends the Face ID `match` event every second while the flows run.
The event matters only while an OS auth sheet is up (create, phrase reveal, lock gate); at any other time the simulator ignores it.
The enrollment commands change the security state of a simulator that exists only for E2E. Never run `run.sh` against your daily simulator.

## Run locally

1. Create an E2E simulator and boot it: `xcrun simctl create vaultme-e2e "iPhone 18 Pro" <runtime id>`, then `xcrun simctl boot <udid>`.
2. Install Maestro 2.11.0 (needs Java 17 or newer): `export MAESTRO_VERSION=2.11.0; curl -Ls "https://get.maestro.mobile.dev" | bash`.
3. Build the app (about 20 minutes the first time): `apps/mobile/.maestro/build-ios.sh`. It uses the staging API like `eas.json`.
4. Run: `SIM_UDID=<udid> apps/mobile/.maestro/run.sh smoke` (or `full`). Report: `apps/mobile/e2e-report.xml`; screenshots of a failure: `apps/mobile/e2e-artifacts/`.

Every flow starts with `clearState` and `clearKeychain`, so it needs a clean app. It wipes the app data on the target simulator.

## Gate rules

Workflow: `.github/workflows/e2e.yml`. Required check: job `e2e` (add it to the branch ruleset).

- A PR that changes `apps/mobile/**`, `packages/{wallet-core,history,i18n,tokens,contracts,api-client}/**`, `pnpm-lock.yaml` or the workflow runs the smoke flows. A failure blocks the merge.
- Other PRs: the job `changes` finds no such file and the job `e2e` is skipped. A skipped job counts as passed for a required check, so these PRs merge without a macOS run. A workflow-level `paths:` filter would not work: the check would never report and the PR would wait forever.
- Nightly (03:00 Asia/Seoul) on `main` and `workflow_dispatch`: all flows. A red nightly is a bug to fix before the next release.
- Once a production environment exists (ADR-0025), the full run becomes the hard gate of the release pipeline.
- Runner: GitHub-hosted `macos-26` (the repository is public). Maestro is pinned (2.11.0, zip checked against its SHA-256). Build: Release, staging API, no test flag.

Sources: Maestro docs (install a version with `MAESTRO_VERSION`, `launchApp` `clearState`/`clearKeychain`, `--include-tags`) read through ctx7 on 2026-11-01; GitHub Docs on skipped required jobs.
Not checked locally: the `macos-26` image, its simulator runtime and its build time (first PR run shows them).
