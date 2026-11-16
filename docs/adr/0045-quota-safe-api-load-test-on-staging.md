# 0045. Quota-safe API load test on staging

Status: Accepted (2026-11-15, issue #523, plan `docs/plans/quality-gates.md` ADR-F, owner decision 9). It adds to [0019](0019-performance-measurements-and-baseline.md) and [0036](0036-api-release-gate-own-time-slo-window.md). It changes no limit and is not a release gate.

## Context
Every API test mocks the Cloudflare limiter bindings (`apps/api/test/rpc.test.ts`), and `packages/perf/k6/api.js` sends one request at a time. Nothing proves on the real bindings that the limit fires, that a 429 carries `Retry-After: 60` and `rate_limited`, or that the API holds under concurrent requests.

## Decision
- `packages/perf/k6/load.js` runs four `constant-arrival-rate` scenarios against staging from one runner IP, one after the other: `steady` (2 req/s for 3 min, 360 `POST /v1/rpc` over 3 installs, every 3rd request to the same install, so 40 per minute against a limit of 60), `install_probe` (3 req/s for 1 min on one install, 65 s later: 180 requests against 60 per 60 s), `ip_probe_rpc` and `ip_probe_history` (20 req/s for 1 min each, no token: 1,200 against 300 per 60 s). A fixed rate at 3 to 4 times our own limit proves the contract (the first run, 43787512493, showed Cloudflare limiters are permissive: 1.5 times the IP limit gave no 429, a burst of 4 times gave 499 of 1,200); a ramp would burn quota to measure an upstream's limit. Authenticated `history` is not loaded: Etherscan is one global bucket shared with real users.
- Thresholds, all in `packages/perf/src/load.ts` (`CHECKS`, one source for k6 and for the evidence file):
  - 0 responses that are a 5xx other than 503 `unavailable`. This one aborts the run (exit 99).
  - 0 steady responses that are not 200 or 503 `unavailable`.
  - Every 429 has `Retry-After: 60` and the code `rate_limited`.
  - Each probe gets a 429. There is no upper cap on the 200s of the install probe (limiters are per location and permissive: 103 of 121 at twice the limit were allowed). An unauthenticated request never gets a 2xx. At most 3 steady requests (1 %) get no answer at all (a connection reset); the first run had one.
  - Own server time p95 under load <= 50 ms (`OWN_P95_MS`, ADR-0036), with at least one sample.
  - 0 dropped iterations (the rate was not delivered, so the run is not valid).
- An upstream that is down does not fail the run (owner decision 9). Each VU counts its 503 `unavailable` answers; above 20 % after 20 requests it calls `exec.test.abort`, k6 exits 108 and `api-load.yml` turns that into a warning. The share of 503 is reported, never judged.
- Budget of one run: at most 540 Infura calls (360 steady + 180 install probe; 43,200 credits, 1.4 % of a day), at most 540 Alchemy calls, 0 Etherscan, 3,000 Workers requests, 3 installs and at least 9 D1 row writes. About 6.35 runs a month use 0.25 % of the Infura credits.
- `.github/workflows/api-load.yml`: Monday 05:11 UTC and manual, `staging` environment, concurrency group `api-latency`, k6 pinned to 2.3.0. It uploads `api-load` and the evidence artifact `evidence-LOAD-1` (ADR-0043).

## Consequences
- Staging only. The test registers 3 installs per run (they stay until the 90-day sweep). A second run from the same IP within 60 s fails in `setup()` (registration is limited to 3 per 60 s); the shared concurrency group prevents it in CI.
- One runner IP, one Cloudflare location: the test proves the contract at that location. The limiters are per location, so it does not prove a global limit.
- A run aborted for an upstream outage has no evidence file. A week of outages shows as a gap in `docs/results/LOAD-1/`.
- Exit code 108 is documented by k6 for `exec.test.abort()` (k6 docs via ctx7, `/grafana/k6-docs`: `execution_result.exit_code: 108`), and checked in a local dry run of k6 2.3.0 against a fake API (an `unavailable` upstream gives 108, a 500 gives 99).
