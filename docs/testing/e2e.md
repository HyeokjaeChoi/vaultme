# Mobile E2E with Maestro

Owner decision C (2026-11-01, issue #316, Q54): Maestro drives the real Release app on an iOS simulator. The release-PR run and the manual full run never broadcast a transaction; only the `funded` flows of a release tag do (#381).

## Flows

Files: `apps/mobile/.maestro/flows/`. Shared steps: `apps/mobile/.maestro/subflows/`.

| Flow | Tag | What it proves |
|---|---|---|
| `create.yaml` | smoke, critical | New wallet (3 checks, OS auth), reveal the phrase, word check, Receive opens |
| `restore.yaml` | smoke, critical | Restore the public test vector (R10); address `0x9858…da94` shows |
| `send.yaml` | smoke, critical | Home, Send, recipient address, amount screen |
| `lock.yaml` | full, critical | Cold start shows the lock gate; OS auth opens Home |
| `receive.yaml` | full, critical | Receive shows the restored address |
| `funded-1-send.yaml` | funded | Restore the funded wallet, real Sepolia ETH send and USDC send to the paired wallet (Review, device auth, broadcast, Confirmed, Activity row) |
| `funded-2-receive.yaml` | funded | Restore the paired wallet from scratch; Activity lists both deposits |

Known limit: `send.yaml` stops at the amount screen, not Review. The test vector has 0 ETH on Sepolia, and the amount screen only
opens Review for an amount above 0 that the balance covers. Review needs a funded wallet: the `funded` flows use one (below).

Slow steps: `assertVisible` retries for 7 s only (Maestro docs). The restore subflows wait for `복구 완료` with `extendedWaitUntil` (30 s), because restore derives the seed, writes the Keychain and asks device auth (#473).

Funded flows (#381, ADR-0033): tag `funded`, run only by `run.sh release` (critical + funded) in `release.yml` on a `v*` tag. The app keeps one account, so there are two wallets of one secret phrase: A (no passphrase) and B (BIP39 passphrase `vaultme-e2e-b`, `scripts/release-wallets.mts`). The iOS job restores A and sends to B; the Android job restores B and sends to A. `funded-2-receive` runs after `funded-1-send` (Maestro runs the flows of a directory in file name order; not verified on a tag yet). `apps/mobile/.maestro/release-run.sh a|b` derives the addresses (`scripts/release-wallet-env.mts`) and passes them as `MAESTRO_*` shell variables (Maestro reads shell variables with the prefix `MAESTRO_` in flows). The phrase is typed word by word from `MAESTRO_PHRASE`. Each run sends an amount no earlier run sent (ETH `0.000NNN`, USDC `0.NN`, from the run number), so a deposit row of an old run cannot pass the receive check. Limits: 12-word phrase only; USDC amounts repeat after 98 runs.

Secret safety: `mask-phrase.sh` emits `::add-mask::` for the phrase and each word (GitHub masks exact strings only; Maestro prints `Input text <word>`). The secret is set only on the mask, run and check steps. A tag run uploads only the JUnit reports (no screenshots, no command logs) and only after `check-no-phrase.sh` finds no phrase word in them. A dry run has no Environment: it runs the five critical flows and uploads as before.

Flows match visible Korean text (button labels are also accessibility labels). A copy change in `packages/i18n` can break a flow: update the flow in the same PR. The app follows the device language (ADR-0037), so `run.sh` pins the iOS simulator to Korean (`AppleLanguages`, `AppleLocale`) and stops on an Android emulator that is not Korean; `release.yml` boots the emulator with `-change-locale ko-KR`. Use a simulator made for E2E: the pin changes its system language.

## Device auth

The app has no auth bypass (ADR-0016). `run.sh` enrolls Face ID on the simulator, then sends the Face ID `match` event every second while the flows run.
The event matters only while an OS auth sheet is up (create, phrase reveal, lock gate); at any other time the simulator ignores it.
Android (`PLATFORM=android`, #382): a PIN and a fingerprint on the emulator; the loop touches finger 1 every second, and `run.sh` stops at once when `dumpsys fingerprint` shows no fingerprint.
The enrollment commands change the security state of a simulator that exists only for E2E. Never run `run.sh` against your daily simulator.

## Run locally

1. Create an E2E simulator and boot it: `xcrun simctl create vaultme-e2e "iPhone 18 Pro" <runtime id>`, then `xcrun simctl boot <udid>`.
2. Install Maestro 2.11.0 (needs Java 17 or newer): `export MAESTRO_VERSION=2.11.0; curl -Ls "https://get.maestro.mobile.dev" | bash`.
3. Build the app (about 20 minutes the first time): `apps/mobile/.maestro/build-ios.sh`. It uses the staging API like `eas.json`.
4. Run: `SIM_UDID=<udid> apps/mobile/.maestro/run.sh smoke` (a quick local check; CI no longer runs `smoke`, ADR-0039), `critical` (what the release PR runs) or `full`. Report: `apps/mobile/e2e-report.xml`; screenshots of a failure: `apps/mobile/e2e-artifacts/`.

The `e2e-report` artifact leaves out the whole `create wallet through backup` directory (#440). That flow shows a generated recovery phrase, and a local failing run (Maestro 2.11.0) showed that every file Maestro writes for it can hold phrase words: the failure screenshot and the view-hierarchy JSON (the word-check screen shows typed words, the reveal screen all 12), `commands.json` and `logs/maestro.log` (`Input text <word>`). A create failure is read from the JUnit report (failed step and message) and a local re-run on a simulator. The wallet is a throwaway that is never funded, but the phrase is still never published (R10).

Every flow starts with `clearState` and `clearKeychain`, so it needs a clean app. It wipes the app data on the target simulator.

## Gate rules

Workflow: `.github/workflows/e2e.yml`. Required check: job `e2e` (add it to the branch ruleset).

- Only a PR with the label `release` (the PR that starts a release) runs the flows tagged `critical` (ADR-0039). A failure blocks the merge. Adding the label starts the run.
- Other PRs: the job `changes` finds no label and the job `e2e` is skipped. A skipped job counts as passed for a required check, so these PRs merge without a macOS run. A workflow-level `paths:` filter would not work: the check would never report and the PR would wait forever.
- Retry: `run.sh` runs each failed flow once more (owner decision 2026-11-03, #376). A flow that fails twice fails the job. A pass on the retry shows a `flaky` warning in the job log, and the retry report is `e2e-report-retry.xml` in the `e2e-report` artifact.
- `workflow_dispatch`: all flows. There is no nightly run (owner decision 2026-11-03, #381).
- Release gate (ADR-0032, #378, #381): a `v*` tag runs the critical path (flows tagged `critical`) and the funded flows; only a pass builds the app with EAS. The release run broadcasts real Sepolia sends; its phrase (`E2E_RELEASE_PHRASE`, GitHub Environment `release`) and those flows' artifacts never reach a log or an upload. There is no separate test path: the first real tag run is the first check of the funded flows (a dry run cannot read the Environment, which admits only `v*` tags). A failure is fixed, merged and re-tagged.
- Release workflow: `.github/workflows/release.yml` (#380). Job `balance` checks both funded wallets and prints their addresses (`scripts/release-balance.mts`), jobs `ios-critical` (simulator) and `android-critical` (emulator, `PLATFORM=android`) run in parallel, job `eas-build` (profile `release-staging`) runs only after all pass. A tag run runs `release-run.sh` (critical + funded flows) and has `environment: release`; a manual run with `dry_run` runs `run.sh critical` in the two jobs (no Environment, no funded flows, no EAS). A retry pass opens a "flaky e2e" issue. Job `version` sets the version name and build number (ADR-0034, `scripts/release-version.sh`); job `api-slo` runs the k6 API benchmark (`api-bench.yml`; it fails on no answer or our own server time over budget, ADR-0036), and `eas-build` waits for it.
- Release owner setup (ADR-0032 Consequences): two funded Sepolia wallets (ETH and USDC on account 1 of A and of B; `pnpm exec tsx scripts/release-wallet-setup.mts` makes the phrase, sets the secret without showing it and prints A's address; the first tag run's `balance` job prints B's address, #392, #381); GitHub Environment `release` that admits only `v*` tags, with secrets `E2E_RELEASE_PHRASE` and `EXPO_TOKEN`; Android signing credentials on Expo (`eas credentials`, once); `e2e` as a required check of `protect-main`; a tag ruleset so only the owner creates `v*` tags.
- Android (#382): `android-critical` builds a Release APK with `build-android.sh` (staging API, no test flag), boots an API 34 `google_apis` x86_64 emulator with `reactivecircus/android-emulator-runner` v2.38.0 on `ubuntu-latest` (KVM enabled by the udev rule from the action README), sets a PIN, enrolls a fingerprint (`apps/mobile/.maestro/enroll-fingerprint-android.yaml`) and touches finger 1 every second (`scripts/sim-auth.sh match android`) while the flows run. Same retry and flaky issue as iOS; artifact `e2e-report-android`.
- Runner: GitHub-hosted `macos-26` for the iOS jobs, `ubuntu-latest` for `android-critical` (the repository is public). Maestro is pinned (2.11.0, zip checked against its SHA-256). Build: Release, staging API, no test flag.

Sources: Maestro docs (install a version with `MAESTRO_VERSION`, `launchApp` `clearState`/`clearKeychain`, `--include-tags`) read through ctx7 on 2026-11-01; Maestro docs `/mobile-dev-inc/maestro-docs` (ctx7, 2026-11-03): shell variables prefixed `MAESTRO_` in flows, `inputText` with `${...}` JavaScript; GitHub Docs on skipped required jobs.
Android: ReactiveCircus/android-emulator-runner README at v2.38.0 (published 2026-07-05; `script` lines run one by one, KVM rule, `enable-hw-keyboard`); Maestro docs `platform` condition and `launchApp` (ctx7, `/mobile-dev-inc/maestro-docs`).
Not checked locally (the Android path ran on CI only: no emulator was run on this Mac; dry run 41611437457 passed all five critical flows on Android): the `macos-26` image, its simulator runtime and its build time (first PR run shows them).
Funded flows not run anywhere yet (needs the secret phrase and a funded wallet B, so only a real `v*` tag run checks them): keypad taps, the Review confirm wait, the Activity row labels and the passphrase field taps are written from the app source and the i18n copy.
