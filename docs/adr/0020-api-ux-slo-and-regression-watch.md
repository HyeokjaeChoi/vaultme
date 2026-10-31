# 0020. The API benchmark has a UX SLO (tier 1) and a regression watch (tier 2)

Status: Accepted (2026-10-31, issue #285, owner decision of 2026-10-31: "two tiers, and derive the SLO from UX standards so it means seamless to a user, not from our own measurements"). Supersedes the threshold part of [0019](0019-performance-measurements-and-baseline.md) (the second amendment, "CI baseline and thresholds for the k6 benchmark"). The rest of 0019 still binds.

## Context
The thresholds of ADR-0019 were 1.5 times the median p95 of 5 runs. They were our own numbers, not a user need, and they were too tight for noise: in the 5 calibration runs, 3 cases went over them in some run (warm health 87.6 ms against 73, warm history hit 73 against 50, cold rpc 658 against 410). The weekly `api-bench` job would fail most weeks for nothing. The same limit also could not tell "slower than before" from "too slow for a user".

## Decision
- Two tiers. Both live in `packages/perf/src/slo.ts` (pure code, tested) and are used by `packages/perf/k6/api.js`.
- Tier 1, the UX SLO: absolute p95 of the total time (DNS + TCP + TLS + request + response), taken from web.dev and Nielsen, not from our measurements. It is a k6 threshold, so a miss fails the `api-bench` job. It never runs in PR CI.
  - User-action reads (`rpc`, `history_hit`): 200 ms warm (INP "good"), 500 ms cold (the INP "needs improvement" upper edge).
  - Screen-load data (`history_miss`): 1000 ms, warm and cold. Derivation and why not 2.5 s minus the page part: [docs/perf/slo.md](../perf/slo.md).
  - `health` is not user-facing: no SLO.
- Tier 2, the regression watch: 1.5 times the highest run p95 of the 5 calibration runs, per case and mode (`WATCH_P95_MS` in `api.js`; `node packages/perf/src/cli.ts bench` prints it from the downloaded `api-bench` run folders, `--runs`, like the baseline). It is computed in `handleSummary`, not as a k6 threshold (a threshold sets the exit code). An exceeded limit writes a `⚠️` line to the job summary and the Markdown, and never fails the job.
- CWV use the 75th percentile of field data. We use p95 of synthetic runs: stricter, and with 30 samples per run it is close to the maximum.
- Change a tier-1 limit only with a source. Change a tier-2 limit by repeating the calibration runs and `cli.ts bench`.

## Consequences
- Known unmet SLO at the time of writing: `history_miss` p95 was 1.2 to 1.9 s in all 5 calibration runs against 1 s. The job fails on it until the API gets faster (3 Etherscan calls per miss, [ADR-0019](0019-performance-measurements-and-baseline.md)) or the owner changes the bound. A red job here is a true finding, not noise.
- Cold `rpc` (500 ms) was over in 1 of 5 runs (658 ms). One run's p95 of 30 samples is near its maximum, so this can fail some weeks.
- The `rpc` case times `eth_blockNumber`, one call. The send review sends 6 calls in parallel; its wait is the slowest of them. The SLO is a floor for that, not a proof.
- Sources and the endpoint-to-user-action mapping: [docs/perf/slo.md](../perf/slo.md).
