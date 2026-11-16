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

Slow steps: `assertVisible` retries for 7 s only (Maestro docs). The restore subflows wait for `복구 완료` with `extendedWaitUntil` (30 s), because restore derives the seed, writes the Keychain and asks device auth (#473); `lock.yaml` and `create.yaml` wait up to 30 s for Home after the OS auth sheet.

Restore typing race (MOB-1): the first flake cause was not the 7 s wait. The restore flows type 12 words and press Return after each; the app moves the focus to the next cell a moment later (from JS), and a fixed wait (`waitForAnimationToEnd` returns at once on a still screen) let the next `inputText` start in the previous cell. One word then sat split over two cells (`abandona` and `bandon`, runs 42345208003 and 42156809851), the word was unknown, and `복구` stayed off. A longer wait after `복구` could not fix that. The plan's fix, waiting for the Maestro selector `focused`, does not work on iOS: Maestro 2.11.0 reports `focused: false` for every restore cell even with the keyboard up (checked on an iOS 27.2 simulator). `subflows/type-word.yaml` now acts per platform: on iOS it presses Return and pauses 1.5 s (a tap on the next cell fails: with the keyboard up cells 5 and 6 sit under the footer until the app scrolls them in, and 3 local runs lost words); on Android it presses Return and waits until the next cell is `focused` (not run locally: no emulator for this work, first check is a `release.yml` dry run). The iOS pause is a margin, not a proof: the focus moves within milliseconds, but nothing can be waited for. Local result: `restore.yaml` 3 of 3 passed on an iOS 27.2 simulator (90, 87, 91 s). `복구` is waited for until it is enabled, so a wrong word fails there. Proof: 10 manual runs (retry needed at most 1, no failed run), see [Flake baseline](#flake-baseline).

Create flow on a slow runner (#653): manual run 43788765786 lost `create wallet through backup` twice (the 확인 hint stayed after 10 s; on the retry the Receive address never showed). It did not reproduce locally (12 of 12 passed, about 70 s per flow against 110 to 130 s on CI), so the cause is a hypothesis: `subflows/answer-word.yaml` waits for the asked cell and gives the tapped cell 1.5 s to take the focus before it types, and `create.yaml` scrolls to the address for up to 40 s. Proof is the 10 manual runs again.

Funded flows (#381, ADR-0033, ADR-0040): tag `funded`, run only by `run.sh release` (critical + funded) in `release.yml` on a `v*` tag. A funded flow waits up to 1,200 s for `보냈어요` (Confirmed needs a receipt at or below the `safe` block, which lags 7 to 13 min on Sepolia, ADR-0006), is never retried (a retry would broadcast again), and is checked on chain afterwards (below). The app keeps one account, so there are two wallets of one secret phrase: A (no passphrase) and B (BIP39 passphrase `vaultme-e2e-b`, `scripts/release-wallets.mts`). The iOS job restores A and sends to B; the Android job restores B and sends to A. `funded-2-receive` runs after `funded-1-send` (Maestro runs the flows of a directory in file name order; not verified on a tag yet). `apps/mobile/.maestro/release-run.sh a|b` derives the addresses (`scripts/release-wallet-env.mts`) and passes them as `MAESTRO_*` shell variables (Maestro reads shell variables with the prefix `MAESTRO_` in flows). The phrase is typed word by word from `MAESTRO_PHRASE`. Each run sends an amount no earlier run sent (ETH `0.000NNN`, USDC `0.NN`, from the run number), so a deposit row of an old run cannot pass the receive check. Limits: 12-word phrase only; USDC amounts repeat after 98 runs.

On-chain check (CHAIN-1, ADR-0040): `scripts/release-verify.mts snapshot a|b` runs before the flows and stores the sender nonce and the block number; `verify a|b` runs after them, also after a failed flow. It fails unless the sender nonce moved by exactly 2, both txs have receipt status 1, the right recipient and amount (ETH: tx `value`; USDC: the `Transfer` log) and a fee at most 0.005 ETH (`ABS_MAX_FEE_WEI`). It prints the Etherscan links of the 2 txs (release wallets only) and `release.yml` uploads them as `release-verify-ios` and `release-verify-android` (90 days). Balance deltas are not used: both jobs send and receive in parallel. Unit tests: `apps/mobile/test/release-verify.test.ts` (fixed numbers, no network); the retry rule: `apps/mobile/test/maestro-retry.test.ts`. The public node keeps no old state, so the script reads full blocks from the snapshot block; it was run against the public Sepolia RPC with the public test vector to check the calls, never with a funded phrase.

Secret safety: `mask-phrase.sh` emits `::add-mask::` for the phrase and each word (GitHub masks exact strings only; Maestro prints `Input text <word>`). The secret is set only on the mask, run, check, `snapshot` and `verify` steps (the last two only derive the public addresses and print addresses and hashes). A tag run uploads only the JUnit reports (and the public `release-verify-ios` and `release-verify-android` files) (no screenshots, no command logs) and only after `check-no-phrase.sh` finds no phrase word in them. A dry run has no Environment: it runs the five critical flows and uploads as before.

Flows match visible Korean text (button labels are also accessibility labels). A copy change in `packages/i18n` can break a flow: update the flow in the same PR. The app follows the device language (ADR-0037), so `run.sh` pins the iOS simulator to Korean (`AppleLanguages`, `AppleLocale`) and stops on an Android emulator that is not Korean; `release.yml` runs `android-locale.sh` (sets `persist.sys.locale` to `ko-KR`, restarts zygote, waits for the boot) before the flows. Use a simulator made for E2E: the pin changes its system language.

## Device auth

The app has no auth bypass (ADR-0016). `run.sh` enrolls Face ID on the simulator, then sends the Face ID `match` event every second while the flows run.
The event matters only while an OS auth sheet is up (create, phrase reveal, lock gate); at any other time the simulator ignores it.
Android (`PLATFORM=android`, #382): a PIN and a fingerprint on the emulator; the loop touches finger 1 every second, and `run.sh` stops at once when `dumpsys fingerprint` shows no fingerprint. `run.sh` installs the APK through `android-ready.sh`: it waits for the package service (`pm path android`) and retries the install, because a framework restart after boot made the install fail (dry run 43774041050). The locale is set by `android-locale.sh`, not by the emulator option `-change-locale`, whose restart raced with the action's own `input keyevent 82` ("Broken pipe", dry runs 43728396216 and 43784174970).
The enrollment commands change the security state of a simulator that exists only for E2E. Never run `run.sh` against your daily simulator.

## Run locally

1. Create an E2E simulator and boot it: `xcrun simctl create vaultme-e2e "iPhone 18 Pro" <runtime id>`, then `xcrun simctl boot <udid>`.
2. Install Maestro 2.11.0 (needs Java 17 or newer): `export MAESTRO_VERSION=2.11.0; curl -Ls "https://get.maestro.mobile.dev" | bash`.
3. Build the app (about 20 minutes the first time): `apps/mobile/.maestro/build-ios.sh`. It uses the staging API like `eas.json`.
4. Run: `SIM_UDID=<udid> apps/mobile/.maestro/run.sh smoke` (a quick local check; CI no longer runs `smoke`, ADR-0039), `critical` (what the release PR runs) or `full`. Report: `apps/mobile/e2e-report.xml`; screenshots of a failure: `apps/mobile/e2e-artifacts/`.

The `e2e-report` artifact leaves out the whole `create wallet through backup` directory (#440). That flow shows a generated recovery phrase, and a local failing run (Maestro 2.11.0) showed that every file Maestro writes for it can hold phrase words: the failure screenshot and the view-hierarchy JSON (the word-check screen shows typed words, the reveal screen all 12), `commands.json` and `logs/maestro.log` (`Input text <word>`). A create failure is read from the JUnit report (failed step and message) and a local re-run on a simulator. The wallet is a throwaway that is never funded, but the phrase is still never published (R10).

Every flow starts with `clearState` and `clearKeychain`, so it needs a clean app. It wipes the app data on the target simulator.

## Flake baseline

Before MOB-1: 85 `e2e` runs from 2026-11-02 to 2026-11-07 (from the `::warning::flaky` annotations): 29 needed a retry (34.1 %), 10 failed after the retry. Most of those runs are from before ADR-0039. After MOB-1: not measured yet. The gate of MOB-1 is 10 manual runs (`e2e.yml` dispatch and `release.yml` with `dry_run`) with at most 1 retry and no failed run. Add one row per run here when they are done (the owner starts them).

| Date | Run | Flows that needed a retry | First-try pass |
|---|---|---|---|

## Release size, cold start and store rules

`release.yml` checks three more things on the Android release APK and reports one on iOS. Scripts: `apps/mobile/.maestro/android-static-gates.sh` and `coldstart-android.sh`, tests in `apps/mobile/test/mobile-gates.test.ts` (stub tools, no emulator).

- MOB-4 install size: the APK fails above 150 MB (150,000,000 B). The iOS simulator `.app` size is only reported in the job summary. The warning at +10 % over a baseline works once `docs/perf/mobile-baseline.env` holds the first numbers (empty today: the first release run is the baseline). The planned fail at +25 % after 2 releases is not coded yet.
- MOB-5 cold start: before the flows, the emulator step force-stops the app and times `am start -W` (`TotalTime`) 1 + 10 times. The median fails at 5,000 ms or more and warns at +25 % over the baseline file. The emulator uses software graphics, so the number is a ceiling check, not a phone speed.
- MOB-9: `targetSdkVersion` of the APK (`aapt2 dump badging`) must be 36 or more, and `zipalign -c -P 16` must pass (16 KB page alignment). It needs build-tools with `-P` (35.0.0 or newer); the script uses the newest installed.
- Limits: the CI APK has one ABI (x86_64, `build-android.sh`), so its size and alignment are proxies for the store build (arm64, AAB). `zipalign -P 16` checks the ZIP layout only, not ELF segment alignment. The cold start step runs before `run.sh` sets the screen to stay on.
- Not run on a real release yet: the first dry run after the merge is the check of the real tools. The numbers are not committed as evidence files yet (ADR-0043); that wiring belongs to the perf evidence work.

## Gate rules

Workflow: `.github/workflows/e2e.yml`. Required check: job `e2e` (add it to the branch ruleset).

- Only a PR with the label `release` (the PR that starts a release) runs the flows tagged `critical` (ADR-0039). A failure blocks the merge. Adding the label starts the run.
- Other PRs: the job `changes` finds no label and the job `e2e` is skipped. A skipped job counts as passed for a required check, so these PRs merge without a macOS run. A workflow-level `paths:` filter would not work: the check would never report and the PR would wait forever.
- Retry: `run.sh` runs each failed flow once more (owner decision 2026-11-03, #376), except a flow tagged `funded`: it is never retried and fails the job at once (ADR-0040; `retry-flows.sh`). A flow that fails twice fails the job. A pass on the retry shows a `flaky` warning in the job log, and the retry report is `e2e-report-retry.xml` in the `e2e-report` artifact.
- `workflow_dispatch`: all flows. There is no nightly run (owner decision 2026-11-03, #381).
- Release gate (ADR-0032, #378, #381): a `v*` tag runs the critical path (flows tagged `critical`) and the funded flows; only a pass builds the app with EAS. The release run broadcasts real Sepolia sends; its phrase (`E2E_RELEASE_PHRASE`, GitHub Environment `release`) and those flows' artifacts never reach a log or an upload. There is no separate test path: the first real tag run is the first check of the funded flows (a dry run cannot read the Environment, which admits only `v*` tags). A failure is fixed, merged and re-tagged.
- Release workflow: `.github/workflows/release.yml` (#380). Job `balance` checks both funded wallets and prints their addresses (`scripts/release-balance.mts`), jobs `ios-critical` (simulator) and `android-critical` (emulator, `PLATFORM=android`) run in parallel, job `eas-build` (profile `release-staging`) runs only after all pass. A tag run runs `release-run.sh` (critical + funded flows) and has `environment: release`; a manual run with `dry_run` runs `run.sh critical` in the two jobs (no Environment, no funded flows, no EAS). A retry pass opens or updates one rolling "flaky e2e" issue per flow and platform, label `flaky` (`flaky-issue.sh`, FLAKY-1): it comments when one is open and never opens a second. The iOS and Android jobs have `timeout-minutes: 150`: the old 90 plus 2 x 20 min of funded waits plus 20 min spare (ADR-0040). Job `version` sets the version name and build number (ADR-0034, `scripts/release-version.sh`); job `api-slo` runs the k6 API benchmark (`api-bench.yml`; it fails on no answer or our own server time over budget, ADR-0036), and `eas-build` waits for it.
- Release owner setup (ADR-0032 Consequences): two funded Sepolia wallets (ETH and USDC on account 1 of A and of B; `pnpm exec tsx scripts/release-wallet-setup.mts` makes the phrase, sets the secret without showing it and prints A's address; the first tag run's `balance` job prints B's address, #392, #381); GitHub Environment `release` that admits only `v*` tags, with secrets `E2E_RELEASE_PHRASE` and `EXPO_TOKEN`; Android signing credentials on Expo (`eas credentials`, once); `e2e` as a required check of `protect-main`; a tag ruleset so only the owner creates `v*` tags.
- Android (#382): `android-critical` builds a Release APK with `build-android.sh` (staging API, no test flag), boots an API 34 `google_apis` x86_64 emulator with `reactivecircus/android-emulator-runner` v2.38.0 on `ubuntu-latest` (KVM enabled by the udev rule from the action README), sets a PIN, enrolls a fingerprint (`apps/mobile/.maestro/enroll-fingerprint-android.yaml`) and touches finger 1 every second (`scripts/sim-auth.sh match android`) while the flows run. Same retry (not for funded flows) and flaky issue as iOS; artifact `e2e-report-android`.
- Runner: GitHub-hosted `macos-26` for the iOS jobs, `ubuntu-latest` for `android-critical` (the repository is public). Maestro is pinned (2.11.0, zip checked against its SHA-256). Build: Release, staging API, no test flag.

Sources: Maestro docs (install a version with `MAESTRO_VERSION`, `launchApp` `clearState`/`clearKeychain`, `--include-tags`) read through ctx7 on 2026-11-01; Maestro docs `/mobile-dev-inc/maestro-docs` (ctx7, 2026-11-03): shell variables prefixed `MAESTRO_` in flows, `inputText` with `${...}` JavaScript; GitHub Docs on skipped required jobs.
Android: ReactiveCircus/android-emulator-runner README at v2.38.0 (published 2026-07-05; `script` lines run one by one, KVM rule, `enable-hw-keyboard`); Maestro docs `platform` condition and `launchApp` (ctx7, `/mobile-dev-inc/maestro-docs`).
Not checked locally (the Android path ran on CI only: no emulator was run on this Mac; dry run 41611437457 passed all five critical flows on Android): the `macos-26` image, its simulator runtime and its build time (first PR run shows them).
Funded flows not run anywhere yet (needs the secret phrase and a funded wallet B, so only a real `v*` tag run checks them): keypad taps, the Review confirm wait, the Activity row labels and the passphrase field taps are written from the app source and the i18n copy. Also first run on that tag: the 1,200 s `extendedWaitUntil` (not run for that long anywhere) and `release-verify.mts` against a real send.
