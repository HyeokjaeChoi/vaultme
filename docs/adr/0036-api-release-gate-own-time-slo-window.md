# 0036. The API release gate checks our own time; the UX SLO is judged over 4 weeks

Status: Accepted (2026-11-04, issue #413, owner decision of 2026-11-04: option A, "regression gate + 4-week SLO"). Supersedes in part [0020](0020-api-ux-slo-and-regression-watch.md): how tier 1 is judged (a k6 threshold per run that fails `api-bench`). Supersedes in part [0034](0034-release-version-rule.md): what the `api-slo` job of the release gate checks. Supersedes in part [0035](0035-warm-rpc-slo-250ms.md): the consequence "a regression fails tier 1 at 250 ms first". The tier 1 limits of 0020 and 0035 and the tier 2 watch still bind.

## Context
The release gate ran `api-bench` once and failed on a tier 1 p95 miss. One run has 30 `rpc` and 5 `history_miss` samples, so the p95 is the 2nd slowest `rpc` request and the slowest `history_miss` request. Server-Timing (#401) shows that all Worker time is upstream time (Infura, Alchemy, Etherscan), and their tail is noisy: 7 of the last 12 runs failed with no change in our code. The gate was flaky, and a pass or fail did not say whether our code got slower.

Sources:
- Google SRE Workbook, "Implementing SLOs": an SLI is good events / total events; "a four-week rolling window" is a good general-purpose interval. https://sre.google/workbook/implementing-slos/
- Google Cloud CRE, "Defining SLOs for services with dependencies": set the SLO from what users need; users do not care whose fault a slow response is, so dependency time stays in the SLO. https://cloud.google.com/blog/products/devops-sre/defining-slos-for-services-with-dependencies-cre-life-lessons
- MongoDB, change point detection: fixed pass/fail thresholds between two noisy benchmark results gave many false alarms. https://www.mongodb.com/blog/post/using-change-point-detection-find-performance-regressions

## Decision
- The UX SLO (tier 1 limits) keeps its limits and keeps the upstream and network time in it. Each timed request is counted good (total time at or under the limit) or not. `api-slo-window.yml` runs after each `api-bench` and `release` run, pools the counts of every `api-bench` artifact of the last 28 days (weekly, manual and release runs) and checks good / total >= 95% per case and mode (`sloWindow` in `packages/perf/src/slo.ts`). A breach opens an issue or comments on the open one. It never blocks a release.
- One run's p95 against the tier 1 limit is still shown, as a warning only.
- The release gate (`api-bench`, job `api-slo` of `release.yml`) fails on two things only: a case with no 200 response, and our own server time over its budget. Own time = Server-Timing `total` minus `upstream`: the limiters, the token check and the route code around `proxyRpc`, without the upstreams and the network. `proxyRpc` itself (hedging, validation) sits inside the `upstream` span, so a delay there is not caught. Budget: p95 <= 50 ms (`OWN_P95_MS`), a quarter of the tightest user-action SLO (200 ms). Only `/v1/rpc` sends Server-Timing today, so the gate covers the `rpc` path.

## Consequences
- Upstream noise no longer fails a release. A slow upstream shows in the 4-week window and in an issue.
- The own-time gate is weak: Workers timers advance only on I/O, so pure CPU work shows as 0, and only the `rpc` path is covered. It catches an added await (a KV, D1 or cache call) on that path. `/v1/history` gets Server-Timing in #412.
- The window needs data: results from before this ADR have no counts and add nothing, so the first weeks judge few requests. `history_miss` has 5 samples per mode per run.
- A release can ship while the window is in breach. The breach issue is the signal to fix the API or to change a limit with a new ADR.
