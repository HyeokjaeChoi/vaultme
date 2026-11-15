# Performance baseline

Measured 2026-11-14 on commit `39fac70` (GitHub Actions ubuntu-latest: web and Hermes from ci run 43559270611, API latency from api-latency run 43695702745 on commit f6380b0 (2026-11-15)). Source of truth for the numbers: `baseline.json` (this file is generated from it).
Storage and procedure: [ADR-0019](../adr/0019-performance-measurements-and-baseline.md). These are measurements, not limits; the SLOs are in [slo.md](slo.md) and the limits stay in `apps/web/lighthouserc.*.json`, `apps/web/scripts/js-budget.ts` and `apps/mobile/package.json`.

## Web: Lighthouse

Median of the runs per page, on the build served by `wrangler dev`. Scores are 0 to 100; BP = best practices.

### Desktop (3 runs per page)

| Page | Perf | A11y | BP | SEO | LCP (ms) | CLS | TBT (ms) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 100 | 100 | 100 | 100 | 310 | 0 | 0 |
| `/address` | 100 | 100 | 100 | 100 | 507 | 0.002 | 0 |
| `/en/` | 100 | 100 | 100 | 100 | 302 | 0.008 | 0 |
| `/en/address` | 100 | 100 | 100 | 100 | 499 | 0.006 | 0 |
| `/en/no-such-page` | 100 | 100 | 96 | 100 | 296 | 0.001 | 0 |
| `/en/tx` | 100 | 100 | 100 | 100 | 514 | 0.001 | 0 |
| `/no-such-page` | 100 | 100 | 96 | 100 | 313 | 0.003 | 0 |
| `/tx` | 100 | 100 | 100 | 100 | 513 | 0.001 | 0 |

### Mobile (5 runs per page)

| Page | Perf | A11y | BP | SEO | LCP (ms) | CLS | TBT (ms) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 100 | 100 | 100 | 100 | 1078 | 0.018 | 0 |
| `/address` | 97 | 100 | 100 | 100 | 2113 | 0.008 | 0 |
| `/en/` | 100 | 100 | 100 | 100 | 1215 | 0.001 | 0 |
| `/en/address` | 97 | 100 | 100 | 100 | 2127 | 0.004 | 0 |
| `/en/no-such-page` | 100 | 100 | 96 | 100 | 1060 | 0.015 | 0 |
| `/en/tx` | 97 | 100 | 100 | 100 | 2037 | 0.016 | 0 |
| `/no-such-page` | 100 | 100 | 96 | 100 | 1079 | 0.008 | 0 |
| `/tx` | 97 | 100 | 100 | 100 | 2051 | 0.003 | 0 |

## Web: JS budget (ADR-0018)

Gzip bytes of the app's own JS per page.

| Page | Bytes | Limit | Files |
| --- | --- | --- | --- |
| `/` | 0 | 102400 | 0 |
| `/address` | 153011 | 153600 | 9 |
| `/en/` | 0 | 102400 | 0 |
| `/en/address` | 153011 | 153600 | 9 |
| `/en/no-such-page` | 0 | 102400 | 0 |
| `/en/tx` | 152573 | 153600 | 9 |
| `/no-such-page` | 0 | 102400 | 0 |
| `/tx` | 152573 | 153600 | 9 |

## Mobile: Hermes bundle

| Platform | Bytes | MiB | Limit (MiB) |
| --- | --- | --- | --- |
| ios | 10236843 | 9.76 | 11.00 |
| android | 10227578 | 9.75 | 11.00 |

## API latency (staging)

Timed from one machine, so it includes the network path to Cloudflare. Calls: 20 health, 20 rpc, 5 history, in that order, one at a time.
History reads the public test address `0x9858EfFD232B4033E47d90003D41EC34EcaEda94`, 31 s apart, so each call is newer than the 30 s page cache.

| Endpoint | Calls ok / sent | p50 (ms) | p95 (ms) |
| --- | --- | --- | --- |
| `GET /v1/health` | 20 / 20 | 44 | 90 |
| `POST /v1/rpc` (`eth_blockNumber`) | 20 / 20 | 90 | 223 |
| `POST /v1/history` | 5 / 5 | 576 | 706 |

## API benchmark (staging, k6, CI runner)

Measured 2026-11-15 on commit `f6380b0` (GitHub Actions ubuntu-latest, k6 2.3.0; api-bench runs 43693316623, 43693796896, 43694278764, 43694747778, 43695236895 on main; the commits differ (f4e3c48, ab4e6ba, ab4e6ba, a71e49e, f6380b0) but packages/perf and the workflow do not), 5 runs of `api-bench` ([README](../../packages/perf/README.md)). Times in ms, total = DNS + TCP + TLS + request + response (HTTP 200 only).
p50 and p95 are the median over the runs; the range columns are the lowest and highest run value (the spread). TCP, TLS and TTFB are medians of the run p50 (0 TCP and TLS in the warm mode: the connection is reused).
Tier 1 SLO: absolute UX limit on the p95, from web.dev and Nielsen ([slo.md](slo.md), [ADR-0020](../adr/0020-api-ux-slo-and-regression-watch.md)); it is judged over 4 weeks of pooled requests and fails no job ([ADR-0036](../adr/0036-api-release-gate-own-time-slo-window.md)). Tier 2 limit: 1.5 times the highest run p95 of the range column, rounded up; it only warns.
The `history_hit` case has no cache marker in the response; a cold-mode hit that reached another Cloudflare server shows up as a slow outlier.

| Endpoint | Mode | ok / sent | p50 | p50 range | p95 | p95 range | TCP p50 | TLS p50 | TTFB p50 | Tier 1 SLO | Tier 2 limit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /v1/health` | warm | 150 / 150 | 13.1 | 7.22-24.62 | 65.5 | 60.9-82.38 | 0 | 0 | 13 | none | 124 |
| `POST /v1/rpc` (`eth_blockNumber`) | warm | 150 / 150 | 61.5 | 25.47-88 | 119.7 | 51.33-186.21 | 0 | 0 | 61.3 | 250 | 280 |
| `POST /v1/history`, cache hit | warm | 75 / 75 | 17.4 | 11.73-30.65 | 31.9 | 13.26-34.47 | 0 | 0 | 16.7 | 200 | 52 |
| `POST /v1/history`, cache miss (Etherscan) | warm | 25 / 25 | 435.7 | 332.54-632.2 | 564.5 | 509.07-692.2 | 0 | 0 | 435 | 1000 | 1039 |
| `GET /v1/health` | cold | 150 / 150 | 59.8 | 39.07-97.51 | 162.1 | 112.54-217.47 | 6.2 | 12.4 | 44.5 | none | 327 |
| `POST /v1/rpc` (`eth_blockNumber`) | cold | 150 / 150 | 100.3 | 83.76-207.07 | 234.8 | 218.36-351.36 | 6 | 11.1 | 89.1 | 500 | 528 |
| `POST /v1/history`, cache hit | cold | 75 / 75 | 73.2 | 40.37-103.83 | 102.3 | 70.42-185.41 | 6 | 10.1 | 57.4 | 500 | 279 |
| `POST /v1/history`, cache miss (Etherscan) | cold | 25 / 25 | 545.2 | 489.9-702.09 | 661.9 | 506.11-775.2 | 5.9 | 11.9 | 526.2 | 1000 | 1163 |
