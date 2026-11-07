# 0039. Mobile E2E runs on the release PR, not on every PR

Status: Accepted (2026-11-07, issue #471, owner decision of 2026-11-07). Supersedes [0032](0032-release-gate-maestro-critical-path.md) in part: "PRs keep the smoke gate".

## Context
ADR-0032 kept the Maestro smoke on every PR that touches the app. On the GitHub-hosted macOS runner each run builds the app (about 20 minutes) and drives the iOS simulator. About a third of the runs needed the retry, and some PRs waited on repeated reruns that passed locally on the same commit (#467, #469). The owner wants PRs to stop waiting on it.

## Decision
- A PR runs the Maestro flows only when it has the label `release`: the PR that starts a release. It runs the flows tagged `critical` (no funded flows, no broadcast).
- Every other PR skips the job `e2e`. The job still reports, so the required check `e2e` stays in the `protect-main` ruleset unchanged (a skipped job passes).
- The manual run (`workflow_dispatch`) still runs every flow. The `v*` tag gate of ADR-0032 is unchanged.

## Consequences
- An app regression that only E2E catches is found at the release PR, not at the PR that caused it. Unit tests, typecheck, lint and the Hermes bundle check still run on every PR.
- Before a release: open (or label) one PR with `release`, wait for `e2e`, then tag.
- The causes of the slow and flaky runs are still open (for example `assertVisible` waits 7 s by default after the restore button, see `docs/testing/e2e.md`).
