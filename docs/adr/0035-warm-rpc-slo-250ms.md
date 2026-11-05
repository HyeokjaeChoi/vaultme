# 0035. The warm rpc SLO is 250 ms

Status: Accepted (2026-11-04, issue #399, owner decision of 2026-11-04: "250ms로 올림"). Supersedes in part [0020](0020-api-ux-slo-and-regression-watch.md): the warm `rpc` limit (200 ms). The rest of 0020 still binds, including warm `history_hit` at 200 ms and all cold limits.

Superseded in part by [0036](0036-api-release-gate-own-time-slo-window.md): a tier 1 miss no longer fails a run; the 4-week window judges it. The 250 ms limit still binds.

## Context
The release gate runs `api-bench` (ADR-0034, #397). Its first run failed cold `rpc`. Server-Timing on `/v1/rpc` (#401) showed that the Worker time is all upstream time: the limiters and the token check add nothing measurable.

Two fixes followed:
- A hedged read (#405, #409): a read that Infura has not answered in 60 ms also goes to Alchemy. Cold `rpc` passed in 7 of 7 runs after it.
- Worker placement near Infura (#403): it helped in 1 of 3 runs and was removed (#407).

Warm `rpc` p95 in the 7 hedged runs: 173.1, 190.07, 166.73, 206.64, 215.59, 177.46, 155.52 ms (5 of 7 pass at 200). In the failing runs both upstreams were slow at the same time (upstream p95 183 to 191 ms), and a hedge cannot beat that. With 30 samples the p95 is the 2nd slowest request, so the limit sat on the measured tail.

## Decision
- Warm `rpc` tier 1 limit: 250 ms (`packages/perf/src/slo.ts`).
- Unchanged: cold `rpc` 500 ms, warm and cold `history_hit` 200 / 500 ms, `history_miss` 1000 ms, and the tier 2 watch (warm `rpc` 280 ms).

## Consequences
- 250 ms is not a UX standard number. It is above INP "good" (200 ms), so the "user action" budget for a balance read on a reused connection now leaves less room for processing and paint.
- The release gate stops failing on upstream noise for warm `rpc`.
- For warm `rpc` the tier 2 watch (280 ms) is now above the SLO, so it gives no early warning: a regression fails tier 1 at 250 ms first. The watch still adds a warning when the p95 goes past 280 ms.
- Revisit when the upstream plan changes (a paid RPC plan) or when hedged runs keep warm `rpc` under 200 ms.
