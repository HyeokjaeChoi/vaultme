# Mobile E2E with Maestro

Owner decision C (2026-11-01, issue #316, Q54): Maestro drives the real Release app on an iOS simulator. The PR smoke and the nightly run never broadcast a transaction.

## Flows

Files: `apps/mobile/.maestro/flows/`. Shared steps: `apps/mobile/.maestro/subflows/`.

| Flow | Tag | What it proves |
|---|---|---|
| `create.yaml` | smoke, critical | New wallet (3 checks, OS auth), reveal the phrase, word check, Receive opens |
| `restore.yaml` | smoke, critical | Restore the public test vector (R10); address `0x9858…da94` shows |
| `send.yaml` | smoke, critical | Home, Send, recipient address, amount screen |
| `lock.yaml` | full, critical | Cold start shows the lock gate; OS auth opens Home |
| `receive.yaml` | full, critical | Receive shows the restored address |

Known limit: `send.yaml` stops at the amount screen, not Review. The test vector has 0 ETH on Sepolia, and the amount screen only
opens Review for an amount above 0 that the balance covers. Review needs a funded test wallet (owner decision; its phrase would be a CI secret, never in the repo).

Flows match visible Korean text (button labels are also accessibility labels). A copy change in `packages/i18n` can break a flow: update the flow in the same PR.

## Device auth

The app has no auth bypass (ADR-0016). `run.sh` enrolls Face ID on the simulator, then sends the Face ID `match` event every second while the flows run.
The event matters only while an OS auth sheet is up (create, phrase reveal, lock gate); at any other time the simulator ignores it.
Android (`PLATFORM=android`, #382): a PIN and a fingerprint on the emulator; the loop touches finger 1 every second, and `run.sh` stops at once when `dumpsys fingerprint` shows no fingerprint.
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
- Retry: `run.sh` runs each failed flow once more (owner decision 2026-11-03, #376). A flow that fails twice fails the job. A pass on the retry shows a `flaky` warning in the job log, and the retry report is `e2e-report-retry.xml` in the `e2e-report` artifact.
- Nightly (03:00 Asia/Seoul) on `main` and `workflow_dispatch`: all flows. A red nightly is a bug to fix before the next release.
- Release gate (ADR-0032, #378; the funded send flows #381 not built yet): a `v*` tag runs the critical path (flows tagged `critical`); only a pass builds the app with EAS. The release run will broadcast real Sepolia sends from a funded wallet (#381); its phrase (`E2E_RELEASE_PHRASE`, GitHub Environment `release`) and those flows' artifacts never reach a log or an upload.
- Release workflow: `.github/workflows/release.yml` (#380). Job `balance` checks the funded wallet (`scripts/release-balance.mts`), jobs `ios-critical` (simulator) and `android-critical` (emulator, `PLATFORM=android run.sh critical`) run in parallel, job `eas-build` (profile `release-staging`) runs only after all pass. A manual run with `dry_run` runs only the two critical jobs (no Environment, no EAS). A retry pass opens a "flaky e2e" issue.
- Release owner setup (ADR-0032 Consequences): a funded Sepolia wallet (ETH and USDC on account 1; `pnpm exec tsx scripts/release-wallet-setup.mts` makes its phrase, sets the secret without showing it and prints the address to fund, #392); GitHub Environment `release` that admits only `v*` tags, with secrets `E2E_RELEASE_PHRASE` and `EXPO_TOKEN`; Android signing credentials on Expo (`eas credentials`, once); `e2e` as a required check of `protect-main`; a tag ruleset so only the owner creates `v*` tags.
- Android (#382): `android-critical` builds a Release APK with `build-android.sh` (staging API, no test flag), boots an API 34 `google_apis` x86_64 emulator with `reactivecircus/android-emulator-runner` v2.38.0 on `ubuntu-latest` (KVM enabled by the udev rule from the action README), sets a PIN, enrolls a fingerprint (`apps/mobile/.maestro/enroll-fingerprint-android.yaml`) and touches finger 1 every second (`scripts/sim-auth.sh match android`) while the flows run. Same retry and flaky issue as iOS; artifact `e2e-report-android`.
- Runner: GitHub-hosted `macos-26` for the iOS jobs, `ubuntu-latest` for `android-critical` (the repository is public). Maestro is pinned (2.11.0, zip checked against its SHA-256). Build: Release, staging API, no test flag.

Sources: Maestro docs (install a version with `MAESTRO_VERSION`, `launchApp` `clearState`/`clearKeychain`, `--include-tags`) read through ctx7 on 2026-11-01; GitHub Docs on skipped required jobs.
Android: ReactiveCircus/android-emulator-runner README at v2.38.0 (published 2026-07-05; `script` lines run one by one, KVM rule, `enable-hw-keyboard`); Maestro docs `platform` condition and `launchApp` (ctx7, `/mobile-dev-inc/maestro-docs`).
Not checked locally (the Android path ran on CI only: no emulator was run on this Mac; dry run 41611437457 passed all five critical flows on Android): the `macos-26` image, its simulator runtime and its build time (first PR run shows them).
