# Service level objectives

What "fast enough" means for VaultMe, where each limit comes from, and how far we are from it. Decision: [ADR-0020](../adr/0020-api-ux-slo-and-regression-watch.md). Measurements: [baseline.md](baseline.md).

## Web: already gated

| SLO | Gate | Source | Attainment |
| --- | --- | --- | --- |
| Lighthouse Performance, Accessibility, Best Practices, SEO each >= 95 | `lhci (desktop)`, `lhci (mobile)` in `apps/web/lighthouserc.desktop.json`, `apps/web/lighthouserc.mobile.json` | [ADR-0012](../adr/0012-web-scope-and-quality-bars.md) | Pass on `main`. Lowest median: Performance 97 (mobile viewer pages) |
| LCP <= 2.5 s | same | [web.dev LCP](https://web.dev/articles/lcp) | Mobile 2.0 to 2.2 s on `/address` and `/tx`; desktop 0.5 s |
| CLS <= 0.1 | same | [web.dev CLS](https://web.dev/articles/cls) | 0 to 0.001 |
| TBT <= 200 ms | same | [web.dev TBT](https://web.dev/articles/tbt) | 0 ms |
| JS: static pages <= 100 KB, viewer (`/address`, `/tx`) <= 150 KB, gzip body | `apps/web/scripts/js-budget.ts` | [ADR-0017](../adr/0017-web-analytics-beacon-and-js-budgets.md), [ADR-0018](../adr/0018-js-budgets-count-compressed-body.md) | Static 0 B; viewer 138.4 KB (141,673 B) |
| Hermes bundle <= 9 MiB | `export:check` in `apps/mobile/package.json` | `AGENTS.md` "Enforced rules" | 7.75 MiB (iOS), 7.74 MiB (Android) |

Attainment is from [baseline.md](baseline.md) (a local run of 2026-10-30) and the LHRs of CI run 41076156239 (mobile LCP).

## API: tier 1, the UX SLO (fails the `api-bench` job)

p95 of the total time (DNS + TCP + TLS + request + response), from GitHub runners to staging. Limits are absolute and come from UX standards. Source of the ms numbers: the "p95 of 5 runs" columns are the 5 calibration runs of `api-bench` on `main` (commit `5827dde`).

| Endpoint | Mode | SLO | Source | p95 of the 5 runs (ms) | Runs within SLO |
| --- | --- | --- | --- | --- | --- |
| `rpc` | warm | 200 ms | INP "good" | 140, 155, 186, 68, 68 | 5 / 5 |
| `rpc` | cold | 500 ms | INP "needs improvement" edge | 184, 183, 658, 397, 271 | 4 / 5 |
| `history_hit` | warm | 200 ms | INP "good" | 73, 52, 33, 29, 28 | 5 / 5 |
| `history_hit` | cold | 500 ms | INP "needs improvement" edge | 115, 109, 142, 98, 440 | 5 / 5 |
| `history_miss` | warm | 1000 ms | RAIL / Nielsen 1 s | 1695, 1348, 1217, 1284, 1206 | 0 / 5 |
| `history_miss` | cold | 1000 ms | RAIL / Nielsen 1 s | 1856, 1445, 1352, 1302, 1271 | 0 / 5 |
| `health` | both | none | not user-facing | tier 2 only | n/a |

Two gaps: `history_miss` misses its SLO in every run (the API makes 3 Etherscan calls per miss; the fix is in the API, not in the limit), and cold `rpc` missed once.

### Endpoint to user action or page load

| Endpoint | Called by | Class | SLO used |
| --- | --- | --- | --- |
| `POST /v1/rpc` | Mobile Home balances on focus and pull-to-refresh (`apps/mobile/src/features/balances/useLiveBalances.ts`, `chain.getBalances`); send review and the re-check before send (`apps/mobile/src/features/send/model/useReviewCore.ts`, `runSend.ts`, `chain.getSnapshot`, 6 parallel calls); submit | user action | 200 / 500 ms |
| `POST /v1/rpc` | Web viewer balances and transaction page (`apps/web/app/shared/api/useBalances.ts`, `useTransaction.ts`) | page load | covered: an endpoint that fits 200 ms fits 1 s |
| `POST /v1/history` cache hit (30 s Worker cache) | Mobile Activity on focus (`apps/mobile/src/features/history/model/useHistory.ts`); web viewer history (`apps/web/app/shared/api/useHistory.ts`) when the same address was read shortly before | user action (navigation) | 200 / 500 ms |
| `POST /v1/history` cache miss | the same callers when no read is in the cache; first read of an address | screen load | 1000 ms |
| `GET /v1/health` | no app code; only the post-deploy check of `.github/workflows/api-staging.yml` | not user-facing | none |

Not benchmarked: `POST /v1/installs` and `/v1/installs/token` (a new install pays both before its first read), `/v1/tx/internal`, `/v1/push/subscription`.

### How the screen-load limit was derived

The design asked for LCP "good" (2.5 s) minus the non-API part of the viewer load, then a clean round-down. Method and result:

1. The lhci runs of CI run 41076156239 (`perf-lhci-mobile`, 5 runs per page, Lighthouse mobile throttling: 150 ms RTT, 1.6 Mbps, 4x CPU) give LCP per page. The URLs are `/address` and `/tx` without a fragment, so they make no API request (0 `/v1/*` requests in every LHR). They measure the page shell: the LCP element is the empty-state or form text, and LCP equals FCP.
2. Mobile LCP of `/address`, `/en/address`, `/tx`, `/en/tx`: 2013 to 2150 ms per run (medians 2015 to 2033 ms). Desktop: 500 to 533 ms.
3. Allowance on mobile = 2500 - 2150 = 350 ms, rounded down to 300 ms. On desktop = 2500 - 533 = 1967 ms, rounded down to 1900 ms.
4. 300 ms is unreasonably small: the cheapest cold call (`health`) already takes 105 to 222 ms at p95, and the viewer needs a token and a read after the shell paints. A limit under the cost of one cold request would fail by design.
5. So the RAIL / Nielsen bound is used: 1 s keeps the user's flow of thought uninterrupted (a delay beyond it needs an indicator, and the viewer shows a skeleton). It is the same on both modes, because a page load starts on a new connection.

Limits of this method: the shell time is a proxy (the viewer with a fragment was not run through lhci), and runner-to-staging latency is a datacenter path, not a phone on 4G. The desktop number (1900 ms) would pass in all 5 runs; the mobile one is binding.

### Sources

- LCP "good" 2.5 s, "poor" > 4 s, 75th percentile: https://web.dev/articles/lcp
- INP "good" <= 200 ms, "needs improvement" <= 500 ms, "poor" > 500 ms, 75th percentile: https://web.dev/articles/inp
- Core Web Vitals thresholds, pass at the 75th percentile: https://web.dev/articles/vitals
- RAIL (100 ms feels immediate, 1 s loses focus, 10 s frustration; response and load goals): https://web.dev/articles/rail
- Nielsen, response-time limits (0.1 s, 1 s, 10 s): https://www.nngroup.com/articles/response-times-3-important-limits/

Core Web Vitals judge the 75th percentile of field data. We judge the p95 of synthetic runs, which is stricter. With 30 samples per run the p95 is close to the maximum, so one slow request can decide a run. INP covers input delay, processing and paint, so giving the network call alone 200 ms leaves no room for the rest: the limit is a ceiling, not a target.

## API: tier 2, the regression watch (warning only)

Limit = 1.5 x the highest p95 of the 5 calibration runs (`WATCH_P95_MS` in `packages/perf/k6/api.js`). An exceeded limit writes a warning line in the job summary and never fails the job.

| Endpoint | Warm (ms) | Cold (ms) |
| --- | --- | --- |
| `health` | 132 | 334 |
| `rpc` | 280 | 987 |
| `history_hit` | 110 | 661 |
| `history_miss` | 2542 | 2785 |
