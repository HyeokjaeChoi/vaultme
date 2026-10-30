# 0019. Performance measurements are recorded, and a baseline is kept in the repo

Status: Accepted (2026-10-30, issue #276, owner decision of 2026-10-30: "record performance measurements and keep a baseline"). It adds to [0012](0012-web-scope-and-quality-bars.md), [0017](0017-web-analytics-beacon-and-js-budgets.md) and [0018](0018-js-budgets-count-compressed-body.md); it changes no limit.

## Context
CI already measures the web Lighthouse scores and the JS budgets, and `export:check` measures the Hermes bundles, but every run throws the numbers away. Nobody can say if a PR made a page slower or the bundle bigger, or how fast staging answers.

## Decision
- Per run: the `lhci` jobs and `verify` upload the numbers as GitHub Actions artifacts with 90-day retention (the default maximum). Names: `perf-lhci-desktop`, `perf-lhci-mobile` (the `lhr-*.json` reports and `js-budget.json`, which `apps/web/scripts/js-budget.ts` now also writes) and `perf-hermes` (bytes of the iOS and Android `.hbc`). They upload even when a gate fails, so a failing run still has numbers. No third-party storage (no Lighthouse CI temporary public storage), no new secret.
- Baseline: `docs/perf/baseline.json` (machine-readable) and `docs/perf/baseline.md` (generated from it), updated by a normal PR. Procedure: download the artifacts of a green `main` run and the latest `api-latency` artifact, then run `node packages/perf/src/cli.ts baseline` (arguments in the file header of `packages/perf/src/cli.ts`). The code is `packages/perf`, with tests. The baseline holds median Lighthouse scores, LCP, CLS and TBT per page; the JS budget rows; the Hermes sizes; and API p50 and p95.
- API latency: `.github/workflows/api-latency.yml`, weekly (`schedule`) and on demand (`workflow_dispatch`), job environment `staging` for the variable `STAGING_API_URL` only (no secret is read). The job registers its own install with `POST /v1/installs` (a key made in memory, nothing stored) and gets a token as the app does, then times `GET /v1/health`, `POST /v1/rpc` (`eth_blockNumber`) and `POST /v1/history` for the public test address of the repo, and writes a job summary and the artifact `api-latency`.
- Calls: 20 health, 20 rpc, 5 history, one at a time, plus 1 untimed `eth_blockNumber` (it registers the install and gets the token). Why these numbers:
  - Limits ([ARCHITECTURE.md](../../ARCHITECTURE.md) Invariants): registration is 3 per 60 s per IP, so one is safe. Token, rpc and history count against 60 per 60 s per install: at most 1 + 21 + 5 = 27, even if all fall in one minute. The IP limit of 300 per 60 s is far away.
  - Etherscan: one history call is 3 Etherscan calls, and the bucket allows 2.5 calls/s. Five calls are 15 Etherscan calls per week. They are 31 s apart, longer than the 30 s page cache, so each call reaches Etherscan and a wait in the bucket stays short.
  - p95 of 20 samples is the 19th value (nearest rank). It is a rough number; five history samples give a rough p95 too (the maximum). More samples would cost API and Etherscan budget for little gain at this stage. Raise N only with the budget reasons above.
- Cost on staging: one `installs` row per run stays in D1 (no code deletes installs). That is 52 rows a year.
- Not in scope: mainnet, real funds, new secrets, changing a threshold, alerting on a regression.

## Consequences
- A baseline from a laptop and one from a runner differ; `baseline.md` names where the numbers came from. Weekly runner numbers replace the first laptop numbers when the baseline is next updated.
- The baseline file is not checked by CI: it says what was measured on a date, and a PR updates it on purpose.
- Scheduled workflows run on the default branch only and GitHub disables them after 60 days without repository activity (public repositories).
