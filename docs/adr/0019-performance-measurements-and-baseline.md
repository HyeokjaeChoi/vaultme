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

## Amendment: k6 benchmark (2026-10-30, issue #281)
- Owner decision: a widely used tool, several runs, and separate cases for a new connection and a reused one. Tool: Grafana k6, pinned to 2.3.0 in `.github/workflows/api-bench.yml` (action `grafana/setup-k6-action`). Script: `packages/perf/k6/api.js`; how to run it: `packages/perf/README.md`.
- Cases: health, rpc, history cache hit, history cache miss; each warm (`MODE=warm`, connection reuse) and cold (`MODE=cold`, k6 `noConnectionReuse`, a new TCP and TLS connection per request). k6 sets `noConnectionReuse` per run, so a mode is a run. Each case has 1 untimed warm-up request.
- Counts: 30 health, 30 rpc, 15 history hits, 5 history misses per mode. Per install: 1 token + 31 rpc + 21 history = 53, under 60 per 60 s. Etherscan: 6 history calls reach it per mode (1 warm-up, 5 misses, 31 s apart, longer than the 30 s cache), 3 Etherscan calls each, so 36 per run for both modes.
- `api-bench` runs weekly and on `workflow_dispatch`, in the concurrency group of `api-latency`. Artifact `api-bench` (90 days) and job summary. No secret, no k6 Cloud. The Node `latency` command stays the source of `docs/perf/baseline.json` until a later PR moves the baseline to k6.
- Only HTTP 200 responses are timed; the report has p50, p90, p95, p99, max, error rate and the parts DNS, TCP, TLS and TTFB. Thresholds: see the second amendment.

## Amendment: CI baseline and thresholds for the k6 benchmark (2026-10-30, issue #283)
- Method: `api-bench` ran 5 times on `main` (commit `5827dde`), one run after the other, on GitHub `ubuntu-latest`. Per endpoint and mode, `baseline.json` (`apiBench`) holds the median over the 5 runs of the run p50 and the run p95 of the total time (DNS + TCP + TLS + request + response, HTTP 200 only), the lowest and highest run value of each (the spread), and the median TCP, TLS and TTFB p50. `node packages/perf/src/cli.ts bench` builds it from the downloaded artifacts and rewrites `baseline.json` and `baseline.md`. The old `api` section (Node `latency`, one laptop) stays until the weekly `api-latency` job is retired.
- Threshold rule: for each endpoint and mode, `p(95)` of the total time must be below 1.5 times the median p95, rounded up to 2 significant digits. The limits are the constant `P95_LIMIT_MS` in `packages/perf/k6/api.js`; `cli.ts bench` prints the new values. Each case also needs at least one 200 response. Warm and cold have separate limits. The thresholds fail only the `api-bench` job (weekly or `workflow_dispatch`): the script runs nowhere else, so PR CI never fails on latency.
- Change a limit only by repeating the 5 runs and this rule, in a PR. The rule uses the median, so one slow run (the p95 range is in `baseline.md`) can fail the job once. One such failure is a signal to look; the owner decides if the rule needs a wider margin.
